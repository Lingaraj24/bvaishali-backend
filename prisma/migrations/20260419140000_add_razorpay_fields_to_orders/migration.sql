-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "razorpay_order_id"   VARCHAR(100),
  ADD COLUMN "razorpay_payment_id" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpay_order_id_key"   ON "orders"("razorpay_order_id");
CREATE UNIQUE INDEX "orders_razorpay_payment_id_key" ON "orders"("razorpay_payment_id");
