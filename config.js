module.exports = {

	service:{
		name: process.env.SERVICE_NAME || "jace-dps",
		mode: process.env.NODE_ENV || "development",
		port: process.env.PORT || 8080,
		host: process.env.HOST || "localhost",
		public:"../.tmp/public",
		upload:"../.tmp/uploads"
	}

}
