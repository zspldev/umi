import { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Setup from "@/pages/setup";
import Session from "@/pages/session";
import TutorSetup from "@/pages/tutor-setup";
import TutorSession from "@/pages/tutor-session";
import History from "@/pages/history";
import SessionDetail from "@/pages/session-detail";
import AdminDashboard from "@/pages/admin";
import NotFound from "@/pages/not-found";
import OnboardingModal from "@/components/OnboardingModal";
import { isOnboarded } from "@/lib/device";
import { TUTOR_ENABLED } from "@/lib/features";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Setup} />
      <Route path="/session" component={Session} />
      {TUTOR_ENABLED ? (
        <>
          <Route path="/tutor-setup" component={TutorSetup} />
          <Route path="/tutor-session" component={TutorSession} />
        </>
      ) : (
        <>
          <Route path="/tutor-setup">{() => <Redirect to="/" />}</Route>
          <Route path="/tutor-session">{() => <Redirect to="/" />}</Route>
        </>
      )}
      <Route path="/history" component={History} />
      <Route path="/history/:id" component={SessionDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [onboarded, setOnboarded] = useState(isOnboarded);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        {!onboarded && <OnboardingModal onDone={() => setOnboarded(true)} />}
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
