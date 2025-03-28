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
exports.deleteRole = exports.updateRole = exports.getRole = exports.getAllRoles = exports.createRole = void 0;
const role_model_1 = require("../models/role.model");
const createRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description } = req.body;
    if (!name || !description) {
        return res.status(422).json({
            message: 'The fields name and description are required'
        });
    }
    const roleInput = {
        name,
        description,
    };
    const roleCreated = role_model_1.Role.insertOne(roleInput);
    return res.status(200).json({ data: roleCreated });
});
exports.createRole = createRole;
const getAllRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const roles = yield role_model_1.Role.find().sort('-createdAt').exec();
    return res.status(200).json({ data: roles });
});
exports.getAllRoles = getAllRoles;
const getRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const role = yield role_model_1.Role.findOne({ _id: id });
    if (!role) {
        return res.status(404).json({ message: `Role with id "${id}" not found.` });
    }
    return res.status(200).json({ data: role });
});
exports.getRole = getRole;
const updateRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { description, name } = req.body;
    const role = yield role_model_1.Role.findOne({ _id: id });
    if (!role) {
        return res.status(404).json({ message: `Role with id "${id}" not found.` });
    }
    if (!name || !description) {
        return res.status(422).json({ message: 'The fields name and description are required' });
    }
    yield role_model_1.Role.updateOne({ _id: id }, { name, description });
    const roleUpdated = yield role_model_1.Role.findById(id, { name, description });
    return res.status(200).json({ data: roleUpdated });
});
exports.updateRole = updateRole;
const deleteRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield role_model_1.Role.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Role deleted successfully.' });
});
exports.deleteRole = deleteRole;
