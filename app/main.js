let isMenuShowing= false; 
let menuOpener = document.querySelector(".menu-opener");
let navMenu = document.querySelector(".navMenu")

const toggleMenu = ()=>{
    
}
menuOpener.addEventListener("click", ()=>{
       // navMenu.style.transform = !"translate(0px, -130%)" ?  "translate(0px, -130%)"  : "translate(0px, 90px)";
        console.log("click");
        if (navMenu.style.transform != "translate(0px, 0px)")
            {
                navMenu.style.transform = "translate(0px, 0px)";
            }
        else
        {
            navMenu.style.transform = "translate(0px, -130%)";
        }
  
});
