module 'fs', 'path';

module.exports = function {
  return function error, details, connection {
  console.log( details.isFile )
    if !error {
      if details.isFile() {
        fs.readFile( function error, contents {
          connection.writeHeader( "Content-Type",
            connection.behavior( "mimes " + path.extname( details.path ) ) )
          connection.end( contents )
        })
      }
    }
  }
}