import logik from './logik.cjs';

export default {
  fetch: function (request, env) {
    return logik.fetch(request, env);
  }
};
