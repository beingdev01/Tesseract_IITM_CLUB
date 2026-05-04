"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowSuspended = exports.RequireFlag = exports.Roles = exports.Public = exports.ALLOW_SUSPENDED = exports.FEATURE_FLAG = exports.ROLES = exports.PUBLIC_ROUTE = void 0;
const common_1 = require("@nestjs/common");
exports.PUBLIC_ROUTE = "publicRoute";
exports.ROLES = "roles";
exports.FEATURE_FLAG = "featureFlag";
exports.ALLOW_SUSPENDED = "allowSuspended";
const Public = () => (0, common_1.SetMetadata)(exports.PUBLIC_ROUTE, true);
exports.Public = Public;
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES, roles);
exports.Roles = Roles;
const RequireFlag = (key) => (0, common_1.SetMetadata)(exports.FEATURE_FLAG, key);
exports.RequireFlag = RequireFlag;
const AllowSuspended = () => (0, common_1.SetMetadata)(exports.ALLOW_SUSPENDED, true);
exports.AllowSuspended = AllowSuspended;
//# sourceMappingURL=decorators.js.map