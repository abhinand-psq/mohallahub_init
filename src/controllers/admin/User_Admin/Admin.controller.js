import CommunityMembership from "../../../models/CommunityMembership.js";
import Post from "../../../models/Post.js";

export const removeMember = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const requesterId = req.user._id;

    const targetMembership = await CommunityMembership.findOne({
      community: communityId,
      user: userId
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        error: { message: "Member not found" }
      });
    }

    // Prevent owner removing themselves
    if (
      requesterId.toString() === userId &&
      targetMembership.role === "owner"
    ) {
      return res.status(403).json({
        success: false,
        error: { message: "Owner cannot remove themselves" }
      });
    }

    // Prevent admin removing owner
    if (
      req.communityRole === "admin" &&
      targetMembership.role === "owner"
    ) {
      return res.status(403).json({
        success: false,
        error: { message: "Admin cannot remove community owner" }
      });
    }

    await CommunityMembership.deleteOne({
      community: communityId,
      user: userId
    });

    return res.json({
      success: true,
      message: "Member removed successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { message: "Failed to remove member" }
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId, communityId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      community: communityId
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: "Post not found" }
      });
    }

    await Post.deleteOne({ _id: postId });

    return res.json({
      success: true,
      message: "Post deleted successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { message: "Failed to delete post" }
    });
  }
};
