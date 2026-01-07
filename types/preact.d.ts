declare module 'preact' {
  export interface VNode<P = {}> {
    type: string | Function;
    props: P;
    key: string | number | null;
  }
  
  export type ComponentChildren = VNode | string | number | boolean | null | undefined | ComponentChildren[];
  export type ComponentChild = ComponentChildren;
  
  export interface FunctionComponent<P = {}> {
    (props: P): VNode<P> | null;
    displayName?: string;
  }
  
  export type FC<P = {}> = FunctionComponent<P>;
  
  export interface Component<P = {}, S = {}> {
    props: P;
    state: S;
    render(): VNode | null;
  }
  
  export function h(type: string, props?: any, ...children: any[]): VNode;
  export function createElement(type: string, props?: any, ...children: any[]): VNode;
  export function createContext<T>(defaultValue: T): any;
  export function createRef<T>(): { current: T | null };
  export function Fragment(props: { children?: ComponentChildren }): VNode | null;
  export function render(vnode: VNode, parent: Element): void;
  export function hydrate(vnode: VNode, parent: Element): void;
  export function cloneElement(vnode: VNode, props?: any, ...children: any[]): VNode;
  export function toChildArray(children: ComponentChildren): VNode[];
  export function isValidElement(vnode: any): boolean;
  
  export interface ClassAttributes<T> {
    ref?: any;
    key?: string | number;
  }
  
  export interface PreactDOMAttributes {
    children?: ComponentChildren;
    dangerouslySetInnerHTML?: { __html: string };
  }
}

declare module 'preact/hooks' {
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends Function>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useContext<T>(context: any): T;
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];
  export function useImperativeHandle<T>(ref: any, createHandle: () => T, deps?: readonly any[]): void;
  export function useDebugValue<T>(value: T, format?: (value: T) => any): void;
  export function useErrorBoundary(): [any, () => void];
}

declare module 'preact/compat' {
  export * from 'preact';
  export * from 'preact/hooks';
}

declare module 'preact/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export { Fragment } from 'preact';
}
