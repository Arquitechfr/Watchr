import { Router } from "express";
import watchlistRouter from "./watchlist.js";
import searchRouter from "./search.js";

const router: Router = Router();

router.use("/watchlist", watchlistRouter);
router.use("/search", searchRouter);

export default router;
