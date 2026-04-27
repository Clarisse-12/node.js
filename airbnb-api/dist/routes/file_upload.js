"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_js_1 = __importDefault(require("../config/multer.js"));
const upload_controller_js_1 = require("../controllers/upload.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// upload.single("image") — Multer middleware runs first
// "image" must match the field name in the multipart form
// authenticate — user must be logged in to upload
// Single file upload — field name must match what the client sends
router.post("/:id/avatar", auth_middleware_js_1.authenticate, multer_js_1.default.single("image"), upload_controller_js_1.uploadAvatar);
router.post("/:id/avatar", auth_middleware_js_1.authenticate, multer_js_1.default.array("image"), upload_controller_js_1.uploadAvatar);
exports.default = router;
