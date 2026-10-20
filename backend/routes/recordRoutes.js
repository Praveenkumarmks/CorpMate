const router = require("express").Router();
const { RESOURCES } = require("../models");
const { protect } = require("../middleware/auth");
const createCrudController = require("../controllers/crudController");

router.use(protect);

// One set of routes per resource:
//   GET/POST /api/harvests      GET/PUT/DELETE /api/harvests/:id      (same for farms, crops, ...)
for (const [name, Model] of Object.entries(RESOURCES)) {
  const controller = createCrudController(Model);
  router.route(`/${name}`).get(controller.list).post(controller.create);
  router.route(`/${name}/:id`).get(controller.getOne).put(controller.update).delete(controller.remove);
}

module.exports = router;
