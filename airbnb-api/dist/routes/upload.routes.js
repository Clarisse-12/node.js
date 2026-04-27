"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_js_1 = __importDefault(require("../config/multer.js"));
const upload_controller_js_1 = require("../controllers/upload.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const uploadRouter = (0, express_1.Router)();
uploadRouter.post("/users/:id/avatar", auth_middleware_js_1.authenticate, multer_js_1.default.single("image"), upload_controller_js_1.uploadAvatar);
uploadRouter.delete("/users/:id/avatar", auth_middleware_js_1.authenticate, upload_controller_js_1.deleteAvatar);
uploadRouter.post("/listings/:id/photos", auth_middleware_js_1.authenticate, multer_js_1.default.array("photos", 5), upload_controller_js_1.uploadListingPhotos);
uploadRouter.delete("/listings/:id/photos/:photoId", auth_middleware_js_1.authenticate, upload_controller_js_1.deleteListingPhoto);
exports.default = uploadRouter;
