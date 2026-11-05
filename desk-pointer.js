import * as THREE from 'three';

// A press that moves less than this is a click; more is a drag.
const CLICK_TOLERANCE_PX = 10;
// Dragging the full height of the screen turns the view by this fraction of a full circle.
const DRAG_TURN_PER_SCREEN = 0.45;

// Mouse, pen and touch input on the 3D canvas: clicks on objects,
// and dragging empty space to look around within the camera's orbit limits.
export function createDeskPointer({ canvas, camera, controls, pickables, focus, onSelect }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let press = null; // The press in progress, from pointerdown until pointerup.

  // The interactive object under the pointer, if any.
  function objectAt(event) {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      (-event.clientY / window.innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    if (!hits.length) return null;
    // The ray hits an individual mesh; walk up to the group that carries the action.
    let object = hits[0].object;
    while (object && !object.userData.action) object = object.parent;
    return object;
  }

  const movedFrom = (event, x, y) => Math.hypot(event.clientX - x, event.clientY - y);

  canvas.addEventListener('pointerdown', (event) => {
    if (event.isPrimary === false || event.button !== 0 || press) return;
    press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      object: objectAt(event),
      dragged: false,
      startView: new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),
    };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!press || press.id !== event.pointerId) return;
    const start = press;
    press = null;
    // A click only counts if it starts and ends on the same object without dragging.
    if (!start.dragged && movedFrom(event, start.x, start.y) < CLICK_TOLERANCE_PX) {
      const object = objectAt(event);
      if (object && object === start.object) onSelect(object);
    }
    canvas.style.cursor = 'default';
  });

  function cancelPress() {
    press = null;
    canvas.style.cursor = 'default';
  }
  canvas.addEventListener('pointercancel', cancelPress);
  canvas.addEventListener('lostpointercapture', cancelPress);

  canvas.addEventListener('pointermove', (event) => {
    if (press) {
      // Only a press that started on empty space can orbit the camera.
      if (focus.active || press.object || press.id !== event.pointerId) return;
      if (!press.dragged) {
        if (movedFrom(event, press.x, press.y) < CLICK_TOLERANCE_PX) return;
        press.dragged = true;
        press.dragX = event.clientX;
        press.dragY = event.clientY;
        canvas.style.cursor = 'grabbing';
        return;
      }
      orbit(event);
      return;
    }
    // Hovering only changes the cursor, so clickable objects stay a quiet discovery.
    if ((focus.active && !focus.browsing) || event.pointerType === 'touch') return;
    canvas.style.cursor = objectAt(event) ? 'pointer' : focus.active ? 'default' : 'grab';
  });

  // Rotate the camera around its target, relative to where the drag started.
  function orbit(event) {
    const radiansPerPixel = (2 * Math.PI * DRAG_TURN_PER_SCREEN) / window.innerHeight;
    const view = press.startView.clone();
    view.radius = camera.position.distanceTo(controls.target);
    view.theta = THREE.MathUtils.clamp(
      view.theta - (event.clientX - press.dragX) * radiansPerPixel,
      controls.minAzimuthAngle,
      controls.maxAzimuthAngle,
    );
    view.phi = THREE.MathUtils.clamp(
      view.phi - (event.clientY - press.dragY) * radiansPerPixel,
      controls.minPolarAngle,
      controls.maxPolarAngle,
    );
    view.makeSafe();
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(view));
    camera.lookAt(controls.target);
    camera.updateMatrixWorld(true);
  }

  // Forget any press in progress, e.g. when the camera is about to move on its own.
  function cancel() {
    press = null;
  }

  return { cancel };
}
