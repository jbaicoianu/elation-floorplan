<?php

class Component_floorplan extends Component {
  public function init() {
    OrmManager::LoadModel("floorplan");
  }

  public function controller_floorplan($args) {
    $vars = array();
    return $this->GetComponentResponse("./floorplan.tpl", $vars);
  }
}  
