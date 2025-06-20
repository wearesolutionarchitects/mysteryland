set albumDate to text returned of (display dialog "Datum des Albums (z. B. 2025-06-15):" default answer "")
set yearPart to text 1 thru 4 of albumDate
set monthPart to text 6 thru 7 of albumDate
set dayPart to text 9 thru 10 of albumDate
set albumName to dayPart & "." & monthPart & "." & yearPart
set exportPath to "/Volumes/Sandisk/Fotos/" & yearPart & "/" & monthPart & "/" & dayPart

-- 📁 Zielordner erstellen, falls er nicht existiert
do shell script "mkdir -p " & quoted form of exportPath
set exportFolder to POSIX file exportPath as alias

tell application "Photos"
	set targetAlbumName to dayPart & "." & monthPart & "." & yearPart
	set foundAlbum to missing value
	
	-- Durchsuche alle Alben nach einem mit passendem Namen
	repeat with a in albums
		if name of a is targetAlbumName then
			set foundAlbum to a
			exit repeat
		end if
	end repeat
	
	if foundAlbum is missing value then
		display dialog "Album nicht gefunden: " & targetAlbumName buttons {"OK"} default button 1
		return
	end if
	
	export (get media items of foundAlbum) to exportFolder with using originals
end tell