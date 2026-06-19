#!/usr/bin/env tsx

import runtime from "./runtime";
import routers from "./routers";
import store from "./store";
runtime.init(routers).then(() => store.getState().tplActions.codexTplMaterialize());