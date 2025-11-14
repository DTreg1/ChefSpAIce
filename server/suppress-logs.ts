// This file must be imported FIRST in server/index.ts to suppress TensorFlow logs
// Sets environment variables before any TensorFlow imports occur

// Suppress TensorFlow informational messages
process.env.TF_CPP_MIN_LOG_LEVEL = '2';
process.env.TF_ENABLE_ONEDNN_OPTS = '0';

export {};