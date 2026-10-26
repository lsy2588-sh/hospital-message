const success = (res, data = null, message = 'success', code = 200) => {
  res.status(code).json({ code, message, data });
};

const fail = (res, message = 'error', code = 400) => {
  res.status(code).json({ code, message, data: null });
};

module.exports = { success, fail };
