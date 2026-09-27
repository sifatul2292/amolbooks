const assert = require('node:assert/strict');
const fs = require('node:fs');

const page = fs.readFileSync('api/upload/static/custom-orders.html', 'utf8');
const editor = fs.readFileSync('api/src/admin-incomplete-order-editor-script.ts', 'utf8');
const controller = fs.readFileSync('api/src/pages/sales/order/order.controller.ts', 'utf8');
const service = fs.readFileSync('api/src/pages/sales/order/order.service.ts', 'utf8');

assert.match(page, /AmolbooksIncompleteEditor\.openOrder\(\\'\'\+o\._id\+\'\\'\)/, 'Actual orders expose the Edit action');
assert.match(page, /class="btn-action btn-edit"/, 'Actual order Edit action has its own visible style');
assert.match(editor, /openOrder: function \(id\) \{ open\(id, 'order'\); \}/, 'Editor exposes actual-order mode');
assert.match(editor, /currentMode === 'order' \? '\/api\/order\/' : '\/api\/order\/incomplete\/'/, 'Actual orders load from the order endpoint');
assert.match(editor, /currentMode === 'order' \? '\/api\/order\/update-order-admin\/' : '\/api\/order\/update-incomplete-order-admin\/'/, 'Actual orders save through the guarded admin update endpoint');
assert.match(editor, /currentOrder && currentOrder\.paymentStatus \|\| 'unpaid'/, 'Actual order edits preserve payment status');
assert.match(controller, /@Put\('\/update-order-admin\/:id'\)[\s\S]*?@UseGuards\(AdminJwtAuthGuard\)/, 'Actual order editor endpoint requires admin authentication');
assert.match(service, /reconcileEditedOrderStock\([\s\S]*?reason: 'manual_adjustment'/, 'Editing stock-accounted orders reconciles tracked inventory');

console.log('Custom order editor checks passed');
