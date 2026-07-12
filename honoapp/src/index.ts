#!/usr/bin/env tsx

import runtime from "./runtime";
import routers from "./routers";
import store from "./store";
import TplGlobal from "./tpl-global";

new TplGlobal().sync();
runtime.init(routers).then(() => store.getState().tplActions.codexTplMaterialize());
