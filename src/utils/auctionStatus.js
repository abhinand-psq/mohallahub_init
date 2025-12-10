export const getAuctionStatus = (auction) => {
  const now = new Date();

  if (auction.isClosed) return "ended";
  if (now < auction.auctionStartTime) return "scheduled";
  if (now <= auction.auctionEndTime) return "active";
  return "ended";
};


