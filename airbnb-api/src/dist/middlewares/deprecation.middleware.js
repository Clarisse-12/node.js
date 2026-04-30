"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecateV1 = deprecateV1;
function deprecateV1(_req, res, next) {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", "Sat, 01 Jan 2026 00:00:00 GMT");
    res.setHeader("Link", '</api/v2>; rel="successor-version"');
    next();
}
