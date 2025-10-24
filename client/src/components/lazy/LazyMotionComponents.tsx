import { lazy, Suspense, ComponentProps } from "react";

// Lazy load motion components
const PageTransition = lazy(() => import("../page-transition").then(module => ({
  default: module.PageTransition
})));

const StaggerContainer = lazy(() => import("../stagger-children").then(module => ({
  default: module.StaggerContainer
})));

const StaggerItem = lazy(() => import("../stagger-children").then(module => ({
  default: module.StaggerItem
})));

const SuccessAnimation = lazy(() => import("../success-animation").then(module => ({
  default: module.SuccessAnimation
})));

const MotionButton = lazy(() => import("../motion-button").then(module => ({
  default: module.MotionButton
})));

// Simple wrapper components that provide fallbacks
export function LazyPageTransition(props: ComponentProps<typeof PageTransition>) {
  return (
    <Suspense fallback={<div className={props.className}>{props.children}</div>}>
      <PageTransition {...props} />
    </Suspense>
  );
}

export function LazyStaggerContainer(props: ComponentProps<typeof StaggerContainer>) {
  return (
    <Suspense fallback={<div className={props.className}>{props.children}</div>}>
      <StaggerContainer {...props} />
    </Suspense>
  );
}

export function LazyStaggerItem(props: ComponentProps<typeof StaggerItem>) {
  return (
    <Suspense fallback={<div className={props.className}>{props.children}</div>}>
      <StaggerItem {...props} />
    </Suspense>
  );
}

export function LazySuccessAnimation(props: ComponentProps<typeof SuccessAnimation>) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-lg font-medium">Success!</div>
      </div>
    }>
      <SuccessAnimation {...props} />
    </Suspense>
  );
}

export function LazyMotionButton(props: ComponentProps<typeof MotionButton>) {
  // Fallback to a regular button
  const { children, className, ...rest } = props;
  return (
    <Suspense fallback={
      <button className={className} {...rest}>
        {children}
      </button>
    }>
      <MotionButton {...props} />
    </Suspense>
  );
}