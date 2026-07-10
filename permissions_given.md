# Permissions Given — Chatbot Workflows

This document records the role-based welcome menus and allowed status transitions for the AI Chatbot.

## 1. Chatbot Menus by Role

* **Project Manager (and Super Admin)**:
  * Create Task
  * Update Status
  * Read Task Details
  * Delete Task
  * Give Approval
  * Add Blocker

* **Team Member**:
  * Update Status
  * Read Task Details
  * Ask Approval
  * Add Blocker

## 2. Action to Status Mapping

* **Give Approval**: Changes task status to `task_approved_by_manager` (Project Manager/Super Admin only).
* **Ask Approval**: Changes task status to `completed` (Team Member only).

## 3. Tasks Status Transition Constraints

Within the backend service:
* Team Members can only transition tasks they are assigned to, and only to: `yet_to_start`, `ongoing`, `blocked`, or `completed`.
* Project Managers and Super Admins can transition any task to any status: `yet_to_start`, `ongoing`, `blocked`, `completed`, `task_approved_by_manager`, `rework`, or `task_approved_by_client`.
