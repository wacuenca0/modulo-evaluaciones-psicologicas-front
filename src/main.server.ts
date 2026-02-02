import { ɵresetCompiledComponents } from '@angular/core';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import {
    ɵdestroyAngularServerApp,
    ɵextractRoutesAndCreateRouteTree,
    ɵgetOrCreateAngularServerApp,
} from '@angular/ssr';
import { App } from './app/app';
import { config } from './app/app.config.server';

export default function bootstrap(context: BootstrapContext) {
    return bootstrapApplication(App, config, context);
}

export { ɵdestroyAngularServerApp, ɵextractRoutesAndCreateRouteTree, ɵgetOrCreateAngularServerApp };
export { ɵresetCompiledComponents };
