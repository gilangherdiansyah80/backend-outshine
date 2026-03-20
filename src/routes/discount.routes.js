const express = require("express");
const router = express.Router();
const discountController = require("../controllers/discount.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Routes need careful ordering or handling because of the requirement:
// GET /products/:id/discount
// POST /products/:id/discount
// PUT /discounts/:id
// DELETE /discounts/:id

// To check: Should I split this into two files?
// Or can I use a logic in index.js to map both?
// User specifically asked for `GET /products/:id/discount`
// This suggests it might be better placed in `product.routes.js` OR I can register this router under 2 paths in `index.js` or handle them separately.

// Let's stick to a clean `discount.routes.js` but we might need to be clever in `index.js`.
// Actually, standard REST often duplicates or nests.
// Let's accept that we might just register specific routes here and mount them properly.
// The user asked for paths:
// GET    /products/:id/discount
// POST   /products/:id/discount
// PUT    /discounts/:id
// DELETE /discounts/:id

// I will define the routes here assuming they are mounted at root `/` or I handle the prefixing inside.
// Ideally, `GET /products/...` suggests it belongs to product router, but `PUT /discounts` suggests a separate resource.
// I'll create a single `discount.routes.js` but maybe I should structure it to handle both if mounted at `/`.
// Or better:
// In `index.js`:
// router.use('/products', productRoutes); <-- existing
// router.use('/discounts', discountRoutes); <-- new for PUT/DELETE

// But for GET/POST /products/:id/discount, I should probably add them to `product.routes.js` or mount a router there.
// However, to keep it modular, let's create `discount.routes.js`.

// Attempt 1: Just handle /discounts/:id here.
// And manually add the /products ones to `product.routes.js` importing the controller.
// This is cleaner for the file structure.

// Wait, the user asked "make endpoints".
// I will reuse `discountController` in `product.routes.js` for the product-related paths.
// And use `discount.routes.js` for the /discounts paths.

// router for /discounts
router.use(authMiddleware);
router.get("/", discountController.getAllDiscounts);
router.put("/:id", discountController.updateDiscount);
router.delete("/:id", discountController.deleteDiscount);

module.exports = router;
