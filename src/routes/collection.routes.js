const express = require("express");
const router = express.Router();
const collectionController = require("../controllers/collection.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.get("/", collectionController.getCollections);
router.post("/", collectionController.createCollection);
router.delete("/:id", collectionController.deleteCollection);

router.get("/:id/products", collectionController.getCollectionProducts);
router.post(
  "/:id/products/:productId",
  collectionController.addProductToCollection,
);
router.delete(
  "/:id/products/:productId",
  collectionController.removeProductFromCollection,
);

module.exports = router;
