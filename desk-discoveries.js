// Each discovery animates only its own object, then restores its exact resting pose.
export function createDeskDiscoveries() {
  const objects = new Map(),
    jobs = new Map();
  function register(key, { duration, update, restore, message, exclusiveGroup }) {
    objects.set(key, { duration, update, restore, message, exclusiveGroup });
  }
  function play(key, now, reduced = false) {
    const object = objects.get(key);
    if (!object || jobs.has(key)) return false;
    if (
      object.exclusiveGroup &&
      [...jobs.values()].some((job) => job.object.exclusiveGroup === object.exclusiveGroup)
    )
      return false;
    if (reduced) object.restore();
    else {
      jobs.set(key, { object, start: now });
      object.update(0);
    }
    return true;
  }
  function update(now) {
    for (const [key, job] of jobs) {
      const t = Math.max(0, Math.min(1, (now - job.start) / job.object.duration));
      if (t === 1) {
        job.object.restore();
        jobs.delete(key);
      } else job.object.update(t);
    }
  }
  function finish() {
    for (const { object } of jobs.values()) object.restore();
    jobs.clear();
  }
  return {
    register,
    play,
    update,
    finish,
    message: (key) => objects.get(key)?.message,
    get active() {
      return jobs.size > 0;
    },
  };
}
