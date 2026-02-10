import {
  Workspace,
  User,
  Client,
  Bundle,
  WorkspaceMember,
  sequelize,
} from "../models/index.js";

import bcrypt from "bcrypt";

async function requireMembership(userId, workspaceId) {
  const membership = await WorkspaceMember.findOne({
    where: {
      workspace_id: workspaceId,
      user_id: userId,
    },
  });
  if (!membership) {
    throw Object.assign(new Error("You are not a member of this workspace"), {
      status: 403,
    });
  }
  return membership;
}

async function requireManager(userId, workspaceId) {
  const membership = await WorkspaceMember.findOne({
    where: {
      workspace_id: workspaceId,
      user_id: userId,
      role: "manager",
    },
  });
  if (!membership) {
    throw Object.assign(new Error("Only managers can perform this action"), {
      status: 403,
    });
  }
  return membership;
}

async function requireOwner(userId, workspaceId) {
  const workspace = await Workspace.findOne({
    where: {
      id: workspaceId,
      user_id: userId,
    },
  });
  if (!workspace) {
    throw Object.assign(
      new Error("Only the workspace owner can perform this action"),
      { status: 403 },
    );
  }
  return workspace;
}

export const listWorkspaces = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const memberships = await WorkspaceMember.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Workspace,
          as: "workspace",
          required: true,
        },
      ],
      order: [[{ model: Workspace, as: "workspace" }, "created_at", "DESC"]],
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      is_default: m.workspace.is_default,
      myRole: m.role,
    }));

    return res.json({ workspaces });
  } catch (err) {
    console.error("List workspaces error:", err);
    return res.status(500).json({ error: "Failed to list workspaces" });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await requireMembership(userId, id);

    const workspace = await Workspace.findByPk(id, {
      include: [
        { model: Client, foreignKey: "workspace_id" },
        { model: Bundle, foreignKey: "workspace_id" },
        {
          model: User,
          as: "members",
          attributes: ["id", "name", "email"],
          through: { attributes: ["role"] },
        },
      ],
    });

    if (!workspace)
      return res.status(404).json({ error: "Workspace not found" });

    const formattedMembers = workspace.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.WorkspaceMember?.role || "user",
      type: "user",
    }));

    return res.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        is_default: workspace.is_default,
        clients: workspace.Clients || [],
        bundles: workspace.Bundles || [],
      },
      members: formattedMembers,
    });
  } catch (err) {
    console.error("Get workspace error:", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ error: err.message || "Failed to get workspace" });
  }
};

export const createWorkspace = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { name, isDefault } = req.body || {};

    if (!userId)
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    if (!name?.trim())
      throw Object.assign(new Error("Workspace name is required"), {
        status: 400,
      });

    if (isDefault) {
      await Workspace.update(
        { is_default: false },
        { where: { user_id: userId }, transaction },
      );
    }

    const workspace = await Workspace.create(
      {
        name: name.trim(),
        user_id: userId,
        is_default: !!isDefault,
      },
      { transaction },
    );

    await WorkspaceMember.create(
      {
        workspace_id: workspace.id,
        user_id: userId,
        role: "manager",
      },
      { transaction },
    );

    await transaction.commit();

    return res.status(201).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        is_default: workspace.is_default,
      },
      members: [
        {
          id: userId,
          name: req.user?.name || "You",
          email: req.user?.email || "",
          role: "manager",
          type: "user",
        },
      ],
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Create workspace error:", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ error: err.message || "Failed to create workspace" });
  }
};

export const updateWorkspace = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { name, isDefault } = req.body || {};

    if (!userId)
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    if (!name?.trim())
      throw Object.assign(new Error("Name is required"), { status: 400 });

    await requireManager(userId, id);

    const workspace = await Workspace.findByPk(id, { transaction });
    if (!workspace)
      throw Object.assign(new Error("Workspace not found"), { status: 404 });

    if (typeof isDefault === "boolean" && isDefault) {
      await Workspace.update(
        { is_default: false },
        { where: { user_id: workspace.user_id }, transaction },
      );
      workspace.is_default = true;
    }

    if (name?.trim()) {
      workspace.name = name.trim();
    }

    await workspace.save({ transaction });
    await transaction.commit();

    return res.json({
      id: workspace.id,
      name: workspace.name,
      is_default: workspace.is_default,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Update workspace error:", err);
    const status = err.status || 400;
    return res
      .status(status)
      .json({ error: err.message || "Failed to update workspace" });
  }
};

// export const deleteWorkspace = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const userId = req.user?.userId;
//     const { id } = req.params;

//     if (!userId)
//       throw Object.assign(new Error("Unauthorized"), { status: 401 });

//     await requireOwner(userId, id);

//     const workspace = await Workspace.findByPk(id, { transaction });
//     if (!workspace)
//       throw Object.assign(new Error("Workspace not found"), { status: 404 });

//     await WorkspaceMember.destroy({ where: { workspace_id: id }, transaction });
//     await Client.destroy({ where: { workspace_id: id }, transaction });
//     await Bundle.destroy({ where: { workspace_id: id }, transaction });
//     await workspace.destroy({ transaction });

//     await transaction.commit();

//     return res.json({ message: "Workspace deleted successfully" });
//   } catch (err) {
//     await transaction.rollback();
//     console.error("Delete workspace error:", err);
//     const status = err.status || 400;
//     return res
//       .status(status)
//       .json({ error: err.message || "Failed to delete workspace" });
//   }
// };
export const deleteWorkspace = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }

    await requireOwner(userId, id);

    const workspace = await Workspace.findByPk(id, { transaction });
    if (!workspace) {
      throw Object.assign(new Error("Workspace not found"), { status: 404 });
    }

    await Client.destroy({
      where: { workspace_id: id },
      transaction,
    });

    await Bundle.destroy({
      where: { workspace_id: id },
      transaction,
    });

    await WorkspaceMember.destroy({
      where: { workspace_id: id },
      transaction,
    });

    await workspace.destroy({ transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Workspace and all related data deleted successfully",
      redirectTo: "/",
    });
  } catch (err) {
    await transaction.rollback();

    const status = err.status || 500;
    const message = err.message || "Failed to delete workspace";

    return res.status(status).json({
      success: false,
      error: message,
      code: err.code || "DELETE_FAILED",
    });
  }
};
export const addMember = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { id: workspaceId } = req.params;
    const { userId: newUserId, role } = req.body;

    if (!userId)
      throw Object.assign(new Error("Unauthorized"), { status: 401 });

    await requireManager(userId, workspaceId);

    if (!newUserId || !role)
      throw Object.assign(new Error("userId and role required"), {
        status: 400,
      });

    const allowedRoles = ["manager", "staff", "user"];
    const normalizedRole = role.toLowerCase();
    if (!allowedRoles.includes(normalizedRole)) throw new Error("Invalid role");

    const user = await User.findByPk(newUserId, { transaction });
    if (!user) throw new Error("User not found");

    const [membership, created] = await WorkspaceMember.findOrCreate({
      where: { workspace_id: workspaceId, user_id: newUserId },
      defaults: { role: normalizedRole },
      transaction,
    });

    if (!created) {
      membership.role = normalizedRole;
      await membership.save({ transaction });
    }

    await transaction.commit();

    return res.json({
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        type: "user",
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Add member error:", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ error: err.message || "Failed to add member" });
  }
};

export const createStaffMember = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { id: workspaceId } = req.params;
    const { name, email, password, role } = req.body;

    if (!userId)
      throw Object.assign(new Error("Unauthorized"), { status: 401 });

    await requireManager(userId, workspaceId);

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      throw Object.assign(
        new Error("Name, email, and password (min 6 chars) required"),
        { status: 400 },
      );
    }

    const allowedRoles = ["manager", "staff"];
    const normalizedRole = (role || "").toLowerCase();
    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error("Role must be manager or staff");
    }

    const existingUser = await User.findOne({
      where: { email: email.trim().toLowerCase() },
      transaction,
    });
    if (existingUser) throw new Error("User with this email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: normalizedRole,
      },
      { transaction },
    );

    await WorkspaceMember.create(
      {
        workspace_id: workspaceId,
        user_id: user.id,
        role: normalizedRole,
      },
      { transaction },
    );

    await transaction.commit();

    return res.status(201).json({
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        type: "user",
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Create staff error:", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ error: err.message || "Failed to create staff member" });
  }
};

export const updateStaffMember = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { id: workspaceId, memberId } = req.params;
    const { name, email, password, role } = req.body;

    if (!userId)
      throw Object.assign(new Error("Unauthorized"), { status: 401 });

    await requireManager(userId, workspaceId);

    const user = await User.findByPk(memberId, { transaction });
    if (!user) throw new Error("Member not found");

    const membership = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: memberId },
      transaction,
    });
    if (!membership) throw new Error("Member not in this workspace");

    if (name?.trim()) user.name = name.trim();
    if (email?.trim()) user.email = email.trim().toLowerCase();
    if (password?.trim())
      user.password = await bcrypt.hash(password.trim(), 10);

    if (role) {
      const allowedRoles = ["manager", "staff", "user"];
      const normalizedRole = role.toLowerCase();
      if (!allowedRoles.includes(normalizedRole)) {
        throw new Error("Invalid role");
      }
      membership.role = normalizedRole;
      user.role = normalizedRole;
    }

    await user.save({ transaction });
    await membership.save({ transaction });

    await transaction.commit();

    return res.json({
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        globalRole: user.role,
        type: "user",
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Update staff error:", err);
    const status = err.status || 400;
    return res
      .status(status)
      .json({ error: err.message || "Failed to update member" });
  }
};

export const deleteStaffMember = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.userId;
    const { id: workspaceId, memberId } = req.params;
    const { deleteUserAccount = false } = req.body || {};

    if (!userId)
      throw Object.assign(new Error("Unauthorized"), { status: 401 });

    await requireManager(userId, workspaceId);

    const membership = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: memberId },
      transaction,
    });
    if (!membership) throw new Error("Member not found in this workspace");

    let message = "Member removed from workspace";

    if (deleteUserAccount === true) {
      const user = await User.findByPk(memberId, { transaction });
      if (!user) throw new Error("User not found");

      const deletedCount = await WorkspaceMember.destroy({
        where: { user_id: memberId },
        transaction,
      });

      await user.destroy({ transaction });

      message = `User and all memberships (${deletedCount}) deleted`;
    } else {
      await membership.destroy({ transaction });
    }

    await transaction.commit();

    return res.json({ success: true, message });
  } catch (err) {
    await transaction.rollback();
    console.error("Delete staff error:", err);
    const status = err.status || 400;
    return res
      .status(status)
      .json({ error: err.message || "Failed to remove member" });
  }
};
