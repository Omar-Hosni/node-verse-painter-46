
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Create a Liveblocks client with default settings
const client = createClient({
  publicApiKey: "pk_dev_xxxxxxxxxxx", // Replace with your public API key
  throttle: 16, // Throttle update rate (60fps)
});

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
    useRoomNotificationSettings,
    useRoomNotifications,
    useThreads,
    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
    useThreadSubscription,
    useMarkThreadAsRead,
    useRoomInfo,
  }
} = createRoomContext<Presence, Storage, UserMeta, ThreadMetadata, RoomEvent>(client);
