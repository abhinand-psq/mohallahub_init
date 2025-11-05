// src/controllers/notification.controller.js
import Notification from "../models/Notification.js";

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const items = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();
    res.json({ success: true, meta: { page: parseInt(page, 10), limit: parseInt(limit, 10) }, data: items });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.findOneAndUpdate({ _id: id, recipient: req.user._id }, { read: true });
    res.json({ success: true, data: { message: "Marked read" } });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true, data: { message: "All marked read" } });
  } catch (err) {
    next(err);
  }
};
