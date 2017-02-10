$(document).ready(function() {
	// Don't let enter accidentally submit the form, which ends up disabling
	// the firewall.
	$("form").on("keypress", function(e) { if (e.keyCode == 13) e.preventDefault(); });

	// If we're not looking at the networktab on page load, hide the action bar.
	// This needs work, as it's hacky.
	if ($("li.active").data('name') !== "networks") {
		$("#action-bar").hide();
	}

	// Update address bar when someone changes tabs
	$("a[data-toggle='tab']").on('shown.bs.tab', function(e) { 
		var newuri = updateQuery("tab", e.target.getAttribute('aria-controls'));
		window.history.replaceState(null, document.title, newuri);
		// If this is NOT the 'Networks' tab, hide the action bar
		if (e.target.getAttribute('aria-controls') !== "networks") {
			$("#action-bar").hide();
		} else {
			$("#action-bar").show();
		}
	});

	/**** Responsive Firewall Tab ***/
	$(".rfw").click(update_rfw);
	$(".safemode").click(update_safemode);
	$(".rejmode").click(update_rejectmode);

	/**** Networks Tab ****/
	// When someone changes a network select tab, update the zone attr
	// so the background-colour changes (defined in the CSS selectors)
	$("#networkstable").on("change", "select", update_zone_attr);

	// Have they clicked on 'add'? 
	$(".addnetwork").on("click", add_new_network);
	// Or, have they pushed enter in the new box, or new description box?
	$(".newentry").on("keydown", function(e) { if (e.keyCode == 13) add_new_network(e) });

	// Clicked the top checkbox button? Toggle.
	$("#toggleall").on("click", function(e) { $(".checkbox").prop("checked", $(e.target).prop("checked")); });

	// Clicked on 'Update all'?
	$("#savenets").on("click", save_all_nets);
	// Pushed enter in a description box?
	$(".description").on("keydown", function(e) { if (e.keyCode == 13) save_all_nets(e) });

	// Clicked on 'Delete Selected'?
	$("#delsel").on("click", delete_all_selected);
});

/**** Responsive Firewall Tab ****/
function update_rfw(event) {
	var target = event.target;
	var d = { command: 'updaterfw', module: 'firewall', proto: target.getAttribute('name'), value: target.getAttribute('value') };
	$("input[name="+target.getAttribute('name')+"]").prop('disabled', true);
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: d,
		complete: function(data) { 
			window.location.href = window.location.href;
		}
	});
}

function update_safemode(event) {
	var target = event.target;
	var d = { command: 'setsafemode', module: 'firewall', value: target.getAttribute('value') };
	var n = target.getAttribute('name');
	$("input[name="+n+"]").prop('disabled', true);
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: d,
		success: function(data) {
			if (typeof data.message !== "undefined") {
				if (data.message == "enabled") {
					$("#safewarning").slideDown();
				} else {
					$("#safewarning").slideUp();
				}
			}
			$("input[name="+n+"]").prop('disabled', false);
		},
	});
}

function update_rejectmode(event) {
	var target = event.target;
	var d = { command: 'setrejectmode', module: 'firewall', value: target.getAttribute('value') };
	var n = target.getAttribute('name');
	$("input[name="+n+"]").prop('disabled', true);
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: d,
		success: function(data) {
			$("input[name="+n+"]").prop('disabled', false);
		},
	});
}

function update_zone_attr(event) {
	var target = $(event.target);
	// The parent id is in data('rowid')
	var parentid = target.data('rowid');
	// Get our divs to update.
	var divs = $("#netcount-"+parentid+",#description-"+parentid);
	if (divs.length === 0) {
		// That shouldn't happen
		return;
	}
	divs.attr('zone', target.val());
}

function add_new_network(event) {
	event.preventDefault();
	var target = $(event.target);
	var c = target.data('counter');
	if (typeof c == "undefined") {
		// Bug.
		console.log("Target doesn't have counter", target);
		return;
	}
	var netname = $("input[name='newentry']").val();
	var descr = $("input[counter='"+c+"']").val();
	var zone = $("select[data-rowid='"+c+"']").val();

	// IF there's no netname, error on it
	if (typeof netname == "undefined" || netname.trim().length == 0) {
		$("input[name='newentry']").addClass('pulsebg');
		window.setTimeout(function() { $("input[name='newentry']").removeClass('pulsebg') }, 2000);
		return;
	}
	// Send it to FreePBX for validation
	// If it errors, use the error handler.
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { command: 'addnetworktozone', module: 'firewall', net: netname, zone: zone, description: descr },
		success: function(data) { window.location.href = window.location.href; },
	});
}

function save_all_nets(ignored) {
	var networks = {};
	// Loop through our networks
	$(".netzone").each(function(i, v) {
		var c = $(v).data('counter');
		var netname = $("tt[counter='"+c+"']").text();
		if (netname.length === 0) {
			return;
		}
		var zone = $("select[name='zone-"+c+"']").val();
		var descr = $("input[name='descr-"+c+"']").val();
		networks[netname] = { zone: zone, description: descr };
	});

	// Now do an ajax post to update our networks
	$.ajax({
		method: 'POST',
		url: window.FreePBX.ajaxurl,
		data: { command: 'updatenetworks', module: 'firewall', json: JSON.stringify(networks) },
		success: function(data) { window.location.href = window.location.href; },
	});
}

function delete_all_selected(ignored) {
	var networks = [];
	// Get all the networks to delete
	$(".checkbox:checked").each(function(i, v) {
		var c = $(v).data('counter');
		networks.push($("tt[counter='"+c+"']").text());
	});
	if (Object.keys(networks).length === 0) {
		alert(_("No networks selected"));
		return;
	}
	// Now do an ajax post to update our networks
	$.ajax({
		method: 'POST',
		url: window.FreePBX.ajaxurl,
		data: { command: 'deletenetworks', module: 'firewall', json: JSON.stringify(networks) },
		success: function(data) { window.location.href = window.location.href; },
	});
}

