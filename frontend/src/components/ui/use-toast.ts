"use client";

import * as React from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 4000;

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "wave";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ActionTypes = {
  ADD_TOAST: "ADD_TOAST";
  UPDATE_TOAST: "UPDATE_TOAST";
  DISMISS_TOAST: "DISMISS_TOAST";
  REMOVE_TOAST: "REMOVE_TOAST";
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type Action =
  | { type: ActionTypes["ADD_TOAST"]; toast: ToastProps }
  | { type: ActionTypes["UPDATE_TOAST"]; toast: Partial<ToastProps> & { id: string } }
  | { type: ActionTypes["DISMISS_TOAST"]; toastId?: string }
  | { type: ActionTypes["REMOVE_TOAST"]; toastId?: string };

interface State {
  toasts: ToastProps[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function addToRemoveQueue(toastId: string, dispatch: React.Dispatch<Action>) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || !action.toastId
            ? { ...t, open: false }
            : t
        ),
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: action.toastId
          ? state.toasts.filter((t) => t.id !== action.toastId)
          : [],
      };
  }
}

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function toast({
  title,
  description,
  variant = "default",
}: Omit<ToastProps, "id">) {
  const id = genId();
  dispatch({
    type: "ADD_TOAST",
    toast: { id, title, description, variant, open: true },
  });
  addToRemoveQueue(id, dispatch);
  return id;
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
export type { ToastProps };
