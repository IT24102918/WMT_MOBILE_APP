const mongoose = require('mongoose');
const dns = require('dns');

let atlasDnsPatched = false;

function patchAtlasDnsLookup() {
  if (atlasDnsPatched) return;

  const originalLookup = dns.lookup.bind(dns);

  dns.lookup = function patchedLookup(hostname, options, callback) {
    let actualOptions = options;
    let actualCallback = callback;

    if (typeof actualOptions === 'function') {
      actualCallback = actualOptions;
      actualOptions = {};
    }

    return originalLookup(hostname, actualOptions, (err, address, family) => {
      const isAtlasHost =
        typeof hostname === 'string' &&
        hostname.endsWith('.mongodb.net') &&
        err &&
        err.code === 'ENOTFOUND';

      if (!isAtlasHost) {
        actualCallback(err, address, family);
        return;
      }

      dns.resolve4(hostname, (resolve4Err, addresses4) => {
        if (!resolve4Err && addresses4?.length) {
          if (actualOptions?.all) {
            actualCallback(
              null,
              addresses4.map((value) => ({ address: value, family: 4 }))
            );
          } else {
            actualCallback(null, addresses4[0], 4);
          }
          return;
        }

        dns.resolve6(hostname, (resolve6Err, addresses6) => {
          if (!resolve6Err && addresses6?.length) {
            if (actualOptions?.all) {
              actualCallback(
                null,
                addresses6.map((value) => ({ address: value, family: 6 }))
              );
            } else {
              actualCallback(null, addresses6[0], 6);
            }
            return;
          }

          actualCallback(err, address, family);
        });
      });
    });
  };

  atlasDnsPatched = true;
}

const connectDB = async () => {
  try {
    patchAtlasDnsLookup();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thowil');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
