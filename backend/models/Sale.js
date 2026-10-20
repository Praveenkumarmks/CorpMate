const mongoose = require("mongoose");
const { userField, locationFields, schemaOptions } = require("./base");

const saleSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    harvest: { type: mongoose.Schema.Types.ObjectId, ref: "Harvest" },
    buyer: String,
    quantity: Number, // kg
    price: Number, // rupees per kg
    status: { type: String, enum: ["Paid", "Pending", "Partial"], default: "Pending" },
  },
  schemaOptions
);

saleSchema.virtual("total").get(function () {
  return (this.quantity || 0) * (this.price || 0);
});

module.exports = mongoose.model("Sale", saleSchema);
