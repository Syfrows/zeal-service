// Vendure 2.0.2 looks up the bootstrap administrator by its original login.
// Skip bootstrap if an active administrator already holds the superadmin role.
const fs = require("fs");
const file = require.resolve("@vendure/core/dist/service/services/administrator.service");
const source = fs.readFileSync(file, "utf8");
const marker = "    async ensureSuperAdminExists() {";
const guard = `
        const existingRole = await this.roleService.getSuperAdminRole();
        const activeAdmin = await this.connection.rawConnection
            .getRepository(administrator_entity_1.Administrator)
            .createQueryBuilder("admin")
            .innerJoin("admin.user", "authUser")
            .innerJoin("authUser.roles", "activeRole")
            .where("activeRole.id = :roleId", { roleId: existingRole.id })
            .andWhere("admin.deletedAt IS NULL AND authUser.deletedAt IS NULL")
            .getCount();
        if (activeAdmin > 0) return;
`;
if (!source.includes(guard)) {
    if (!source.includes(marker)) throw new Error("Review administrator bootstrap after updating Vendure.");
    fs.writeFileSync(file, source.replace(marker, marker + guard));
}
