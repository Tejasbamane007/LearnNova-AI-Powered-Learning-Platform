// Handle errors in controllers
exports.handleError = (res, error) => {
  console.error('Error:', error);
  
  // Check if it's a validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  // Check if it's a duplicate key error
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate Key Error',
      error: `Duplicate value for ${Object.keys(error.keyValue).join(', ')}`
    });
  }
  
  // Check if it's a cast error (invalid ID)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID',
      error: `Invalid ${error.path}: ${error.value}`
    });
  }
  
  // Default error response
  return res.status(500).json({
    success: false,
    message: 'Server Error',
    error: error.message || 'Something went wrong'
  });
};