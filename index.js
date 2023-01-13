
const router = require('express').Router()
router.post("/", require("./src/controller"))
router.get("/", (req, res) => {
	res.send({
		service: "Data Processing Script 2.0.0",
		state: "ready"
	})
})

module.exports = router;