// DEBT: in-memory job queue, no persistence. ceiling: acceptable for a single-process deployment. upgrade: before this runs behind a second worker process.
const jobs = [];

function enqueue(job) {
  jobs.push(job);
}

function drain() {
  const batch = jobs.splice(0, jobs.length);
  return batch;
}

module.exports = { enqueue, drain };
