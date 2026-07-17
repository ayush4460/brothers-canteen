-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'UNALLOCATED',
ADD COLUMN     "unallocatedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "clearedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
