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
assert.match(page, /whatsappAction\(o, 'incomplete'\)/, 'Incomplete orders expose a WhatsApp action');
assert.match(page, /whatsappAction\(o, 'order'\)/, 'Actual orders expose a WhatsApp action');
assert.match(page, /আপনি আমাদের কাছে একটি বই অর্ডারের জন্য ফর্ম পূরণ করেছিলেন, কিন্তু অর্ডারটি সম্পন্ন হয়নি/, 'Incomplete orders use abandoned-order copy');
assert.match(page, /আমলবুকস থেকে আপনার অর্ডারটি আমরা পেয়েছি/, 'Actual orders use order-confirmation copy');
assert.match(page, /whatsappBookSummary\(o\.orderedItems\)/, 'WhatsApp messages include ordered book names');
assert.match(page, /বইয়ের নাম:/, 'WhatsApp messages label the ordered books');
assert.match(page, /https:\/\/wa\.me\//, 'WhatsApp opens with a prefilled message');
assert.match(page, /custom-orders\.html\?view=insights/, 'Sidebar exposes customer and bundle insights');
assert.match(page, /\/api\/order\/customer-bundle-insights/, 'Insights page loads the aggregation endpoint');
assert.match(controller, /@Get\('\/customer-bundle-insights'\)[\s\S]*?@UseGuards\(AdminJwtAuthGuard\)/, 'Insights endpoint requires admin authentication');
assert.match(service, /repeatCustomers:[\s\S]*?orderCount: \{ \$gte: 2 \}/, 'Repeat-customer results require multiple valid orders');
assert.match(service, /multiItemOrders:[\s\S]*?products:[\s\S]*?\$map:/, 'Insights retain every product from multi-item orders');
assert.match(service, /for \(let size = 3; size <= Math\.min\(4, order\.products\.length\)/, 'Recommendations use repeated three- and four-book combinations');
assert.match(service, /recommendationWindowDays = 90[\s\S]*?recentOrderCount > 1/, 'Recommendations require repeated purchases in the recent window');
assert.match(service, /orderBundles,[\s\S]*?bundleSuggestions/, 'Endpoint returns recommendations and complete packages');
assert.match(page, /Complete multi-item packages/, 'Page shows complete customer baskets');
assert.match(page, /Recommended ad bundles/, 'Page shows ranked advertising bundle suggestions');
assert.match(service, /OrderStatus\.CANCEL[\s\S]*?OrderStatus\.REFUND[\s\S]*?OrderStatus\.RETURN[\s\S]*?OrderStatus\.HOLD/, 'Invalid order statuses are excluded from insights');

console.log('Custom order editor checks passed');
