const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Reviews usually accessed via product, but DELETE /reviews/:id is global
// Prompt:
// PUT    /reviews/:id  (Update review? Not implemented in service yet but in controller.. wait, controller deleteReview matches prompt DELETE)
// DELETE /reviews/:id

router.use(authMiddleware);
router.delete("/:id", reviewController.deleteReview);
// router.put("/:id") - Update not requested code in service yet, ignoring for now based on service impl.

module.exports = router;
