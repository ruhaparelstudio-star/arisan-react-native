import { create } from 'zustand';
import {
  collection,
  collectionGroup,
  documentId,
  getDocs,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { firestore } from '@/services/firebase';
import type { Group } from '@arisan/shared/types';

export type GroupWithId = Group & { id: string };

type GroupsState = {
  groups: GroupWithId[];
  loading: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (uid: string) => void;
  unsubscribeAll: () => void;
};

function chunked<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  loading: true,
  unsubscribe: null,

  subscribe: (uid) => {
    // Hindari double-subscribe.
    get().unsubscribe?.();

    const db = firestore();
    const membershipsQuery = query(collectionGroup(db, 'members'), where('userId', '==', uid));

    const unsub = onSnapshot(
      membershipsQuery,
      async (snap) => {
        const groupIds = snap.docs
          .map((d) => d.ref.parent.parent?.id)
          .filter((id): id is string => !!id);

        if (groupIds.length === 0) {
          set({ groups: [], loading: false });
          return;
        }

        try {
          const groupsCol = collection(db, 'groups');
          const groupDocs = await Promise.all(
            chunked(groupIds, 10).map((chunk) =>
              getDocs(query(groupsCol, where(documentId(), 'in', chunk))),
            ),
          );
          const groups: GroupWithId[] = groupDocs.flatMap((s) =>
            s.docs.map((d) => {
              const data = d.data() as Omit<Group, 'id'>;
              return { ...data, id: d.id };
            }),
          );
          set({ groups, loading: false });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('groups fetch error', err);
          set({ loading: false });
        }
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('groups subscribe error', err);
        set({ loading: false });
      },
    );

    set({ unsubscribe: unsub });
  },

  unsubscribeAll: () => {
    get().unsubscribe?.();
    set({ unsubscribe: null, groups: [], loading: true });
  },
}));
