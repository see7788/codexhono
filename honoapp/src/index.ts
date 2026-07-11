#!/usr/bin/env tsx

import runtime from "./runtime";
import routers from "./routers";
import store from "./store";
import userCodexConfigSync from "./tpl/usercodex";
userCodexConfigSync();
runtime.init(routers).then(() => store.getState().tplActions.codexTplMaterialize());
