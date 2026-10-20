const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { pickBody } = require("../utils/sanitize");

const FILTERS = ["crop", "farm", "field", "status", "category"];

// Builds list / get / create / update / delete handlers for any model.
// Every query includes { user: req.userId }, so people only ever reach their own data.
function createCrudController(Model) {
  const hasDate = Boolean(Model.schema.path("date"));

  const list = asyncHandler(async (req, res) => {
    const filter = { user: req.userId };

    for (const key of FILTERS) {
      if (typeof req.query[key] === "string" && Model.schema.path(key)) filter[key] = req.query[key];
    }
    if (hasDate && (req.query.from || req.query.to)) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }

    const sort = hasDate ? { date: -1 } : { createdAt: -1 };
    res.json(await Model.find(filter).sort(sort).limit(1000));
  });

  const getOne = asyncHandler(async (req, res) => {
    const doc = await Model.findOne({ _id: req.params.id, user: req.userId });
    if (!doc) throw new AppError("Not found", 404);
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    const doc = await Model.create({ ...pickBody(req.body), user: req.userId });
    res.status(201).json(doc);
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await Model.findOneAndUpdate({ _id: req.params.id, user: req.userId }, pickBody(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) throw new AppError("Not found", 404);
    res.json(doc);
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!doc) throw new AppError("Not found", 404);
    res.json({ ok: true });
  });

  return { list, getOne, create, update, remove };
}

module.exports = createCrudController;
