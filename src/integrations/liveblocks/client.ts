
import { createClient, LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Define collaboration room types
type Presence = {
  cursor: { x: number; y: number } | null;
  isDrawing: boolean;
  tool: string;
  color: string;
};

type FabricObject = {
  id: string;
  type: string;
  version: number;
  props: Record<string, any>;
};

// Make sure storage types work with Liveblocks
type Storage = {
  canvasObjects: LiveMap<string, FabricObject>;
};

type UserMeta = {
  id: string;
  info: {
    name?: string;
    avatar?: string;
    color?: string;
  };
};

type ThreadMetadata = {
  resolved: boolean;
};

type RoomEvent = {
  type: "CANVAS_RESET";
} | {
  type: "CANVAS_OBJECT_ADDED";
  objectId: string;
} | {
  type: "CANVAS_OBJECT_MODIFIED";
  objectId: string;
};

// Create a Liveblocks client with your public API key
const client = createClient({
  publicApiKey: "pk_dev_aUfwRFjobfGZgRsiQvOa4rIGvTxyN7SvtiT2pYWHPEb28VXfDH358BV81gfR4YYV",
  throttle: 16, // Throttle update rate (60fps)
});

export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useSelf,
    useStorage,
    useMutation,
    useHistory,
    useUndo,
    useRedo,
    useBatch,
    useStatus,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useThreads,
    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
  }
} = createRoomContext<Presence, Storage, UserMeta, ThreadMetadata, RoomEvent>(client);
