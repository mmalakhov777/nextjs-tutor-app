# File Annotations in Chat Messages

This document explains how file annotations (citations) are displayed below assistant messages in the chat interface.

## Overview

When the AI assistant references documents in a response, the application displays these references as clickable file cards below the message. This feature provides:

1. Visual indication of source documents used by the AI
2. Quick access to the referenced documents
3. Metadata about each source (authors, publication year, document type)

## Technical Implementation

### Component Structure

The annotations system is built with three key components:

1. **Message Component** (`Message.tsx`): Handles receiving annotations and managing metadata
2. **FileAnnotations Component** (`FileAnnotations.tsx`): Renders the file cards
3. **Home Component** (`home.tsx`): Coordinates communication between backend and UI

### Real-time Annotation Display

We've implemented a two-fold approach to ensure annotations appear immediately after streaming:

1. **Event-Based System**:
   - The chat system dispatches a custom `annotation-event` when annotation data is received
   - Event listeners in `home.tsx` capture these events and immediately update the UI
   - This provides real-time updates without requiring page refresh

2. **API Fallback**:
   - If events are missed, a backup system fetches annotations via API
   - This runs 500ms after streaming ends for reliability
   - The system uses timestamp proximity to match annotations to messages

### Performance Optimization

We've implemented several optimizations to ensure smooth performance:

1. **React.memo** for both `Message` and `FileAnnotations` components to prevent unnecessary rerenders
2. **useMemo** for citation processing to avoid recalculating on every render
3. **Custom equality functions** to perform precise comparisons of props
4. **Debounced metadata fetching** to prevent API request floods

### Metadata Caching System

To improve performance and reduce API calls, we've implemented a metadata caching system:

1. **Centralized Cache**:
   - A metadata cache is maintained at the `Home` component level
   - Previously fetched file metadata is stored in `fileMetadataCache`
   - This cache persists across messages and conversation sessions

2. **Cache Flow**:
   - The cache is passed down through `ChatContent` → `ChatMessages` → `Message` components
   - Before making API calls, components check if metadata already exists in the cache
   - If found, cached metadata is used immediately without API calls

3. **Cache Updates**:
   - When new annotations are received, the system extracts file IDs
   - Any missing metadata is fetched once and stored in the cache
   - Subsequent references to the same files use the cached data

4. **Benefits**:
   - Reduced API calls and network traffic
   - Faster rendering of file cards
   - Improved user experience with immediate display of metadata

### Metadata Handling

When annotations are received:

1. The system extracts unique file IDs from the annotations
2. For each file ID, it checks the cache first before making API calls
3. Metadata is fetched only for files not already in the cache
4. This metadata is displayed in the file cards
5. Loading states provide visual feedback during any necessary fetching

## User Experience

From the user's perspective:

1. User sends a message to the AI
2. AI responds with a streaming message that cites documents
3. File cards automatically appear below the message showing the referenced documents
4. Each card displays:
   - Filename (truncated if too long)
   - First author (with "+N" indicator if multiple authors)
   - Document type (e.g., PDF, webpage)
   - Publication year (if available)
5. Clicking a card opens the full document details
6. Subsequent references to the same files appear instantly without loading delay

## Troubleshooting

If file cards aren't appearing:

1. Check browser console for errors in annotation processing
2. Verify annotations are being received in the stream (look for `annotations=` events)
3. Ensure metadata fetching is completing successfully
4. Check if the metadata cache is working properly
5. Try refreshing the page if cards appear only after refresh

## Future Improvements

Potential enhancements for the annotation system:

1. Highlighting specific sections within documents that were referenced
2. Expanding the cards to show brief excerpts from the cited text
3. Adding more metadata fields like relevance score or page numbers
4. Implementing drag-and-drop reordering of citation cards
5. Persisting the metadata cache to localStorage for faster loading across sessions 