"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const common_1 = require("@nestjs/common");
const bearer_token_1 = require("../src/common/auth/bearer-token");
function token(request) {
    return (0, bearer_token_1.getBearerTokenFromRequest)(request);
}
strict_1.default.equal(token({ headers: { authorization: 'Bearer abc.123' }, rawHeaders: [] }), 'abc.123');
strict_1.default.equal(token({ get: () => 'Bearer from-get', headers: {}, rawHeaders: [] }), 'from-get');
strict_1.default.equal(token({ headers: { authorization: ['Bearer first', 'Bearer second'] } }), 'first');
strict_1.default.equal(token({ headers: {}, rawHeaders: ['authorization', 'Bearer raw-token'] }), 'raw-token');
strict_1.default.throws(() => token({ headers: {}, rawHeaders: [] }), (error) => error instanceof common_1.UnauthorizedException &&
    error.message === 'Authorization header was not received by the API.');
strict_1.default.throws(() => token({ headers: { authorization: 'Token bad' }, rawHeaders: [] }), (error) => error instanceof common_1.UnauthorizedException &&
    error.message === 'Authorization header must use Bearer scheme.');
console.log('auth-header tests passed');
//# sourceMappingURL=auth-header.test.js.map