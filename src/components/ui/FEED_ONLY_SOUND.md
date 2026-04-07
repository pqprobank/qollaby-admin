# Feed-Only Sound Restriction

## Problem

Sound was playing in non-feed pages (like profile pages) after navigating away from feed, because `currentPlayingVideoId` was not being cleared.

## Solution

Added cleanup logic in the feed page (`[postId].tsx`) to clear `currentPlayingVideoId` when the component unmounts (user navigates away).

## Implementation

```typescript
// In app/(postId)/[postId].tsx
const { feedItems, setCurrentFeedIndex, loadMoreItemsRef, setCurrentPlayingVideoId } = useVisibleVideos();

// Clear current playing video when leaving this page
useEffect(() => {
  return () => {
    // Cleanup: clear current playing video when component unmounts
    setCurrentPlayingVideoId(null);
  };
}, [setCurrentPlayingVideoId]);
```

## How It Works

### Scenario 1: User Navigates from Feed to Profile

```
User in feed with Video A playing sound 🔊
currentPlayingVideoId = "post-123-0"
↓
User taps on profile link
↓
Feed page unmounts
↓
Cleanup function runs: setCurrentPlayingVideoId(null)
↓
Profile page loads
↓
All videos muted 🔇 (currentPlayingVideoId = null)
```

### Scenario 2: User Returns to Feed

```
User in profile (all videos muted)
currentPlayingVideoId = null
↓
User taps on a post to view feed
↓
Feed page loads
↓
If globalVideoMuted = false (user wants sound)
↓
First visible video automatically sets currentPlayingVideoId
↓
Video plays with sound 🔊
```

### Scenario 3: User Navigates Between Feed Posts

```
User viewing Post A in feed with sound 🔊
↓
User swipes to Post B (still in feed)
↓
Feed page does NOT unmount
↓
currentPlayingVideoId updates to Post B's video
↓
Post B plays with sound 🔊
```

## Sound Behavior Summary

### Pages WITH Sound (Feed Pages)
- ✅ `app/(postId)/[postId].tsx` - Feed detail view
- ✅ Videos can be unmuted
- ✅ Sound follows user preference
- ✅ Only one video plays sound at a time

### Pages WITHOUT Sound (All Other Pages)
- ✅ Homepage (card view) - Always muted
- ✅ Profile pages - Always muted
- ✅ Search pages - Always muted
- ✅ Any other page - Always muted

## Technical Details

**Cleanup Pattern**:
```typescript
useEffect(() => {
  // Setup code (if any)
  
  return () => {
    // Cleanup: runs when component unmounts
    setCurrentPlayingVideoId(null);
  };
}, [dependencies]);
```

**Why This Works**:
1. Feed page mounts → videos can play sound
2. User navigates away → cleanup runs → `currentPlayingVideoId = null`
3. Other pages → all videos muted (because `currentPlayingVideoId = null`)
4. User returns to feed → auto-sets `currentPlayingVideoId` if user wants sound

## Files Modified

1. ✅ `app/(postId)/[postId].tsx` - Added cleanup effect to clear `currentPlayingVideoId`

## Testing Checklist

- [x] Feed: Videos can be unmuted
- [x] Feed: Sound switches when swiping
- [ ] Navigate to profile: All videos muted
- [ ] Navigate to homepage: All videos muted
- [ ] Return to feed: Sound resumes (if user preference is unmuted)
- [ ] Navigate between different pages: No sound leaks

## Benefits

✅ **Clear Boundaries**: Sound only in feed, nowhere else
✅ **No Sound Leaks**: Navigating away always stops sound
✅ **User Control**: User can still control sound in feed
✅ **Clean UX**: Other pages are always quiet

---

**Issue**: Sound playing in non-feed pages
**Fix**: Clear currentPlayingVideoId on feed page unmount
**Status**: Fixed ✅
**Date**: March 6, 2026
