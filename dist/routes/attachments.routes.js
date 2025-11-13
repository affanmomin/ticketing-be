"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = attachmentsRoutes;
const attachments_controller_1 = require("../controllers/attachments.controller");
const attachments_schema_1 = require("../schemas/attachments.schema");
function attachmentsRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.get('/tickets/:id/attachments', { schema: { params: attachments_schema_1.ListAttachmentsParams } }, attachments_controller_1.listAttachmentsCtrl);
        app.post('/tickets/:id/attachments/presign', { schema: { params: attachments_schema_1.ListAttachmentsParams, body: attachments_schema_1.PresignAttachmentBody } }, attachments_controller_1.presignAttachmentCtrl);
        app.post('/tickets/:id/attachments/confirm', { schema: { params: attachments_schema_1.ListAttachmentsParams, body: attachments_schema_1.ConfirmAttachmentBody } }, attachments_controller_1.confirmAttachmentCtrl);
        app.delete('/attachments/:id', { schema: { params: attachments_schema_1.AttachmentIdParams } }, attachments_controller_1.deleteAttachmentCtrl);
    });
}
