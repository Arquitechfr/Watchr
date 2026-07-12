import { Types } from "mongoose";
import { ContactMessage, type ContactCategory, type ContactStatus } from "../../models/contactMessage.model.js";
import { EmailService } from "../email.service.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { log } from "../../lib/logger.js";

export interface ListContactQuery {
  page: number;
  limit: number;
  status?: ContactStatus;
  category?: ContactCategory;
}

export interface ContactListResult {
  data: ContactMessageDoc[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ContactMessageDoc {
  id: string;
  userId: string;
  email: string;
  username: string;
  category: ContactCategory;
  subject: string;
  message: string;
  status: ContactStatus;
  repliedAt?: string;
  replyBody?: string;
  repliedBy?: string;
  createdAt: string;
  updatedAt: string;
}

function toDoc(doc: any): ContactMessageDoc {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    email: doc.email,
    username: doc.username,
    category: doc.category,
    subject: doc.subject,
    message: doc.message,
    status: doc.status,
    repliedAt: doc.repliedAt?.toISOString(),
    replyBody: doc.replyBody,
    repliedBy: doc.repliedBy?.toString(),
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}

export async function listContactMessages(query: ListContactQuery): Promise<ContactListResult> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;

  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    ContactMessage.countDocuments(filter),
  ]);

  return {
    data: docs.map(toDoc),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function getContactStats(): Promise<{
  total: number;
  new: number;
  read: number;
  resolved: number;
  archived: number;
}> {
  const [total, newCount, readCount, resolvedCount, archivedCount] = await Promise.all([
    ContactMessage.countDocuments(),
    ContactMessage.countDocuments({ status: "new" }),
    ContactMessage.countDocuments({ status: "read" }),
    ContactMessage.countDocuments({ status: "resolved" }),
    ContactMessage.countDocuments({ status: "archived" }),
  ]);

  return {
    total,
    new: newCount,
    read: readCount,
    resolved: resolvedCount,
    archived: archivedCount,
  };
}

export async function getContactDetail(id: string): Promise<ContactMessageDoc | null> {
  const doc = await ContactMessage.findById(id).lean();
  if (!doc) return null;
  return toDoc(doc);
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<ContactMessageDoc> {
  const doc = await ContactMessage.findByIdAndUpdate(id, { status }, { new: true }).lean();
  if (!doc) {
    throw new ApiError(404, "CONTACT_NOT_FOUND", "Contact message not found");
  }
  return toDoc(doc);
}

export async function replyToContactMessage(
  id: string,
  replyMessage: string,
  adminId: string,
): Promise<{ success: boolean; doc: ContactMessageDoc }> {
  const message = await ContactMessage.findById(id);
  if (!message) {
    throw new ApiError(404, "CONTACT_NOT_FOUND", "Contact message not found");
  }

  if (message.repliedAt) {
    throw new ApiError(409, "CONTACT_ALREADY_REPLIED", "This message has already been replied to");
  }

  const emailSent = await EmailService.sendContactReplyEmail(
    message.email,
    message.subject,
    replyMessage,
    undefined,
    adminId,
  );

  message.repliedAt = new Date();
  message.replyBody = replyMessage;
  message.repliedBy = new Types.ObjectId(adminId);
  message.status = "resolved";
  await message.save();

  log("AdminContact", "reply sent", {
    contactId: id,
    to: message.email,
    emailSent,
  });

  return {
    success: emailSent,
    doc: toDoc(message.toObject()),
  };
}
