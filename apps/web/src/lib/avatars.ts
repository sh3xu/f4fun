export interface Avatar {
  id: string;
  label: string;
  url: string;
}

export const AVATARS: Avatar[] = [
  {
    id: "memo_1",
    label: "Avatar 1",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_1.png",
  },
  {
    id: "memo_2",
    label: "Avatar 2",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_2.png",
  },
  {
    id: "memo_3",
    label: "Avatar 3",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_3.png",
  },
  {
    id: "memo_4",
    label: "Avatar 4",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_4.png",
  },
  {
    id: "memo_5",
    label: "Avatar 5",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_5.png",
  },
  {
    id: "memo_6",
    label: "Avatar 6",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_6.png",
  },
  {
    id: "memo_7",
    label: "Avatar 7",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_7.png",
  },
  {
    id: "memo_8",
    label: "Avatar 8",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_8.png",
  },
  {
    id: "memo_9",
    label: "Avatar 9",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_9.png",
  },
  {
    id: "memo_10",
    label: "Avatar 10",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_10.png",
  },
  {
    id: "memo_11",
    label: "Avatar 11",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_11.png",
  },
  {
    id: "memo_12",
    label: "Avatar 12",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_12.png",
  },
  {
    id: "memo_13",
    label: "Avatar 13",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_13.png",
  },
  {
    id: "memo_14",
    label: "Avatar 14",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_14.png",
  },
  {
    id: "memo_15",
    label: "Avatar 15",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_15.png",
  },
  {
    id: "memo_16",
    label: "Avatar 16",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_16.png",
  },
  {
    id: "memo_17",
    label: "Avatar 17",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_17.png",
  },
  {
    id: "memo_18",
    label: "Avatar 18",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_18.png",
  },
  {
    id: "memo_19",
    label: "Avatar 19",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_19.png",
  },
  {
    id: "memo_20",
    label: "Avatar 20",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_20.png",
  },
  {
    id: "memo_21",
    label: "Avatar 21",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_21.png",
  },
  {
    id: "memo_22",
    label: "Avatar 22",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_22.png",
  },
  {
    id: "memo_23",
    label: "Avatar 23",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_23.png",
  },
  {
    id: "memo_24",
    label: "Avatar 24",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_24.png",
  },
  {
    id: "memo_25",
    label: "Avatar 25",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_25.png",
  },
  {
    id: "memo_26",
    label: "Avatar 26",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_26.png",
  },
  {
    id: "memo_27",
    label: "Avatar 27",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_27.png",
  },
  {
    id: "memo_28",
    label: "Avatar 28",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_28.png",
  },
  {
    id: "memo_29",
    label: "Avatar 29",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_29.png",
  },
  {
    id: "memo_30",
    label: "Avatar 30",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_30.png",
  },
  {
    id: "memo_31",
    label: "Avatar 31",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_31.png",
  },
  {
    id: "memo_32",
    label: "Avatar 32",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_32.png",
  },
  {
    id: "memo_33",
    label: "Avatar 33",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_33.png",
  },
  {
    id: "memo_34",
    label: "Avatar 34",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_34.png",
  },
  {
    id: "memo_35",
    label: "Avatar 35",
    url: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_35.png",
  },
];

export function getAvatarById(id: string): Avatar {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

export function getAvatarUrl(avatarId: string): string {
  return getAvatarById(avatarId).url;
}
