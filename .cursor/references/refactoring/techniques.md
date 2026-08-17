# Refactoring — techniques

Cite `tech:<slug>`. Load this file + catalog/foundations.

---

# Techniques â€” Composing Methods


> Composing Methods â€” slim methods, kill duplication, name intent.

**Process:** one small step â†’ tests green â†’ next. âŠ¥ mix feature work in same commit.

## Extract Method (`extract-method`)

| | |
| --- | --- |
| **problem** | You have a code fragment that can be grouped together. |
| **solution** | Move this code to a separate new method (or function) and replace the old code with a call to the method. |
| **why** | The more lines found in a method, the harder itâ€™s to figure out what the method does. This is the main reason for this refactoring. Besides eliminating rough edges in your code, extracting methods is also a step in many other refactoring approaches. |
| **how** | Create a new method and name it in a way that makes its purpose self-evident. Copy the relevant code fragment to your new method. Delete the fragment from its old location and put a call for the new method there instead. Find all variables used in this code fragment. If theyâ€™re declared inside the fragment and not used outside of it, simply leave them unchangedâ€”theyâ€™ll become local variables for the new method. If the variables are declared prior to the code that youâ€™re extracting, you will need to pass theseâ€¦ |

## Inline Method (`inline-method`)

| | |
| --- | --- |
| **problem** | When a method body is more obvious than the method itself, use this technique. |
| **solution** | Replace calls to the method with the methodâ€™s content and delete the method itself. |
| **why** | A method simply delegates to another method. In itself, this delegation is no problem. But when there are many such methods, they become a confusing tangle thatâ€™s hard to sort through. Often methods arenâ€™t too short originally , but become that way as changes are made to theâ€¦ |
| **how** | Make sure that the method isnâ€™t redefined in subclasses. If the method is redefined, refrain from this technique. Find all calls to the method. Replace these calls with the content of the method. Delete the method. |

## Extract Variable (`extract-variable`)

| | |
| --- | --- |
| **problem** | You have an expression thatâ€™s hard to understand. |
| **solution** | Place the result of the expression or its parts in separate variables that are self-explanatory. |
| **why** | The main reason for extracting variables is to make a complex expression more understandable, by dividing it into its intermediate parts. These could be: Condition of the if() operator or a part of the ?: operator in C-based languages A long arithmetic expression withoutâ€¦ |
| **how** | Insert a new line before the relevant expression and declare a new variable there. Assign part of the complex expression to this variable. Replace that part of the expression with the new variable. Repeat the process for all complex parts of the expression. |

## Inline Temp (`inline-temp`)

| | |
| --- | --- |
| **problem** | You have a temporary variable thatâ€™s assigned the result of a simple expression and nothing more. |
| **solution** | Replace the references to the variable with the expression itself. |
| **why** | Inline local variables are almost always used as part of Replace Temp with Query or to pave the way for Extract Method . |
| **how** | Find all places that use the variable. Instead of the variable, use the expression that had been assigned to it. Delete the declaration of the variable and its assignment line. |

## Replace Temp With Query (`replace-temp-with-query`)

| | |
| --- | --- |
| **problem** | You place the result of an expression in a local variable for later use in your code. |
| **solution** | Move the entire expression to a separate method and return the result from it. Query the method instead of using a variable. Incorporate the new method in other methods, if necessary. |
| **why** | This refactoring can lay the groundwork for applying Extract Method for a portion of a very long method. The same expression may sometimes be found in other methods as well, which is one reason to consider creating a common method. |
| **how** | Make sure that a value is assigned to the variable once and only once within the method. If not, use Split Temporary Variable to ensure that the variable will be used only to store the result of your expression. Use Extract Method to place the expression of interest in a new method. Make sure that this method only returns a value and doesnâ€™t change the state of the object. If the method affects the visible state of the object, use Separate Query from Modifier . Replace the variable with a query to your new method. |

## Split Temporary Variable (`split-temporary-variable`)

| | |
| --- | --- |
| **problem** | You have a local variable thatâ€™s used to store various intermediate values inside a method (except for cycle variables). |
| **solution** | Use different variables for different values. Each variable should be responsible for only one particular thing. |
| **why** | If youâ€™re skimping on the number of variables inside a function and reusing them for various unrelated purposes, youâ€™re sure to encounter problems as soon as you need to make changes to the code containing the variables. You will have to recheck each case of variable use toâ€¦ |
| **how** | Find the first place in the code where the variable is given a value. Here you should rename the variable with a name that corresponds to the value being assigned. Use the new name instead of the old one in places where this value of the variable is used. Repeat as needed for places where the variable is assigned a different value. |

## Remove Assignments To Parameters (`remove-assignments-to-parameters`)

| | |
| --- | --- |
| **problem** | Some value is assigned to a parameter inside methodâ€™s body. |
| **solution** | Use a local variable instead of a parameter. |
| **why** | The reasons for this refactoring are the same as for Split Temporary Variable , but in this case weâ€™re dealing with a parameter, not a local variable. First, if a parameter is passed via reference, then after the parameter value is changed inside the method, this value isâ€¦ |
| **how** | Create a local variable and assign the initial value of your parameter. In all method code that follows this line, replace the parameter with your new local variable. |

## Replace Method With Method Object (`replace-method-with-method-object`)

| | |
| --- | --- |
| **problem** | You have a long method in which the local variables are so intertwined that you canâ€™t apply Extract Method . |
| **solution** | Transform the method into a separate class so that the local variables become fields of the class. Then you can split the method into several methods within the same class. |
| **why** | A method is too long and you canâ€™t separate it due to tangled masses of local variables that are hard to isolate from each other. The first step is to isolate the entire method into a separate class and turn its local variables into fields of the class. Firstly, this allowsâ€¦ |
| **how** | Create a new class. Name it based on the purpose of the method that youâ€™re refactoring. In the new class, create a private field for storing a reference to an instance of the class in which the method was previously located. It could be used to get some required data from the original class if needed. Create a separate private field for each local variable of the method. Create a constructor that accepts as parameters the values of all local variables of the method and also initializes the corresponding privateâ€¦ |

## Substitute Algorithm (`substitute-algorithm`)

| | |
| --- | --- |
| **problem** | So you want to replace an existing algorithm with a new one? |
| **solution** | Replace the body of the method that implements the algorithm with a new algorithm. |
| **why** | Gradual refactoring isnâ€™t the only method for improving a program. Sometimes a method is so cluttered with issues that itâ€™s easier to tear down the method and start fresh. And perhaps you have found an algorithm thatâ€™s much simpler and more efficient. If this is the case, youâ€¦ |
| **how** | Make sure that you have simplified the existing algorithm as much as possible. Move unimportant code to other methods using Extract Method . The fewer moving parts in your algorithm, the easier itâ€™s to replace. Create your new algorithm in a new method. Replace the old algorithm with the new one and start testing the program. If the results donâ€™t match, return to the old implementation and compare the results. Identify the causes of the discrepancy. While the cause is often an error in the old algorithm, itâ€™sâ€¦ |

---

# Techniques â€” Moving Features


> Moving Features â€” relocate behavior/fields; hide or expose delegation wisely.

**Process:** one small step â†’ tests green â†’ next. âŠ¥ mix feature work in same commit.

## Move Method (`move-method`)

| | |
| --- | --- |
| **problem** | A method is used more in another class than in its own class. |
| **solution** | Create a new method in the class that uses the method the most, then move code from the old method to there. Turn the code of the original method into a reference to the new method in the other class or else remove it entirely. |
| **why** | You want to move a method to a class that contains most of the data used by the method. This makes classes more internally coherent . You want to move a method in order to reduce or eliminate the dependency of the class calling the method on the class in which itâ€™s located.â€¦ |
| **how** | Verify all features used by the old method in its class. It may be a good idea to move them as well. As a rule, if a feature is used only by the method under consideration, you should certainly move the feature to it. If the feature is used by other methods too, you should move these methods as well. Sometimes itâ€™s much easier to move a large number of methods than to set up relationships between them in different classes. Make sure that the method isnâ€™t declared in superclasses and subclasses. If this is theâ€¦ |

## Move Field (`move-field`)

| | |
| --- | --- |
| **problem** | A field is used more in another class than in its own class. |
| **solution** | Create a field in a new class and redirect all users of the old field to it. |
| **why** | Often fields are moved as part of the Extract Class technique. Deciding which class to leave the field in can be tough. Here is our rule of thumb: put a field in the same place as the methods that use it (or else where most of these methods are). This rule will help in otherâ€¦ |
| **how** | If the field is public, refactoring will be much easier if you make the field private and provide public access methods (for this, you can use Encapsulate Field ). Create the same field with access methods in the recipient class. Decide how you will refer to the recipient class. You may already have a field or method that returns the appropriate object; if not, you will need to write a new method or field to store the object of the recipient class. Replace all references to the old field with appropriate calls toâ€¦ |

## Extract Class (`extract-class`)

| | |
| --- | --- |
| **problem** | When one class does the work of two, awkwardness results. |
| **solution** | Instead, create a new class and place the fields and methods responsible for the relevant functionality in it. |
| **why** | Classes always start out clear and easy to understand. They do their job and mind their own business as it were, without butting into the work of other classes. But as the program expands, a method is added and then a field... and eventually, some classes are performing moreâ€¦ |
| **how** | â€” |

## Inline Class (`inline-class`)

| | |
| --- | --- |
| **problem** | A class does almost nothing and isnâ€™t responsible for anything, and no additional responsibilities are planned for it. |
| **solution** | Move all features from the class to another one. |
| **why** | - Often this technique is needed after the features of one class are â€œtransplantedâ€ to other classes, leaving that class with little to do. |
| **how** | In the recipient class, create the public fields and methods present in the donor class. Methods should refer to the equivalent methods of the donor class. Replace all references to the donor class with references to the fields and methods of the recipient class. Now test the program and make sure that no errors have been added. If tests show that everything is working A-OK, start using Move Method and Move Field to completely transplant all functionality to the recipient class from the original one. Continueâ€¦ |

## Hide Delegate (`hide-delegate`)

| | |
| --- | --- |
| **problem** | The client gets object B from a field or method of object Ð. Then the client calls a method of object B. |
| **solution** | Create a new method in class A that delegates the call to object B. Now the client doesnâ€™t know about, or depend on, class B. |
| **why** | To start with, letâ€™s look at terminology: Server is the object to which the client has direct access. Delegate is the end object that contains the functionality needed by the client. A call chain appears when a client requests an object from another object, then the secondâ€¦ |
| **how** | For each method of the delegate-class called by the client, create a method in the server-class that delegates the call to the delegate-class . Change the client code so that it calls the methods of the server-class . If your changes free the client from needing the delegate-class , you can remove the access method to the delegate-class from the server-class (the method that was originally used to get the delegate-class ). |

## Remove Middle Man (`remove-middle-man`)

| | |
| --- | --- |
| **problem** | A class has too many methods that simply delegate to other objects. |
| **solution** | Delete these methods and force the client to call the end methods directly. |
| **why** | To describe this technique, weâ€™ll use the terms from Hide Delegate , which are: Server is the object to which the client has direct access. Delegate is the end object that contains the functionality needed by the client. There are two types of problems: The server-class doesnâ€™tâ€¦ |
| **how** | Create a getter for accessing the delegate-class object from the server-class object. Replace calls to delegating methods in the server-class with direct calls for methods in the delegate-class . |

## Introduce Foreign Method (`introduce-foreign-method`)

| | |
| --- | --- |
| **problem** | A utility class doesnâ€™t contain the method that you need and you canâ€™t add the method to the class. |
| **solution** | Add the method to a client class and pass an object of the utility class to it as an argument. |
| **why** | You have code that uses the data and methods of a certain class. You realize that the code will look and work much better inside a new method in the class. But you canâ€™t add the method to the class because, for example, the class is located in a third-party library. Thisâ€¦ |
| **how** | Create a new method in the client class. In this method, create a parameter to which the object of the utility class will be passed. If this object can be obtained from the client class, you donâ€™t have to create such a parameter. Extract the relevant code fragments to this method and replace them with method calls. Be sure to leave the Foreign method tag in the comments for the method along with the advice to place this method in a utility class if such becomes possible later. This will make it easier toâ€¦ |

## Introduce Local Extension (`introduce-local-extension`)

| | |
| --- | --- |
| **problem** | A utility class doesnâ€™t contain some methods that you need. But you canâ€™t add these methods to the class. |
| **solution** | Create a new class containing the methods and make it either the child or wrapper of the utility class. |
| **why** | The class that youâ€™re using doesnâ€™t have the methods that you need. Whatâ€™s worse, you canâ€™t add these methods (because the classes are in a third-party library, for example). There are two ways out: Create a subclass from the relevant class, containing the methods andâ€¦ |
| **how** | Create a new extension class: Option A: Make it a child of the utility class. Option B: If you have decided to make a wrapper, create a field in it for storing the utility class object to which delegation will be made. When using this option, you will need to also create methods that repeat the public methods of the utility class and contain simple delegation to the methods of the utility object. Create a constructor that uses the parameters of the constructor of the utility class. Also create an alternativeâ€¦ |

---

# Techniques â€” Organizing Data


> Organizing Data â€” rich types over primitives; encapsulate; untangle associations.

**Process:** one small step â†’ tests green â†’ next. âŠ¥ mix feature work in same commit.

## Self Encapsulate Field (`self-encapsulate-field`)

| | |
| --- | --- |
| **problem** | You use direct access to private fields inside a class. |
| **solution** | Create a getter and setter for the field, and use only them for accessing the field. |
| **why** | Sometimes directly accessing a private field inside a class just isnâ€™t flexible enough. You want to be able to initiate a field value when the first query is made or perform certain operations on new values of the field when theyâ€™re assigned, or maybe do all this in variousâ€¦ |
| **how** | Create a getter (and optional setter) for the field. They should be either protected or public . Find all direct invocations of the field and replace them with getter and setter calls. |

## Replace Data Value With Object (`replace-data-value-with-object`)

| | |
| --- | --- |
| **problem** | A class (or group of classes) contains a data field. The field has its own behavior and associated data. |
| **solution** | Create a new class, place the old field and its behavior in the class, and store the object of the class in the original class. |
| **why** | This refactoring is basically a special case of Extract Class . What makes it different is the cause of the refactoring. In Extract Class , we have a single class thatâ€™s responsible for different things and we want to split up its responsibilities. With replacement of a dataâ€¦ |
| **how** | â€” |

## Change Value To Reference (`change-value-to-reference`)

| | |
| --- | --- |
| **problem** | So you have many identical instances of a single class that you need to replace with a single object. |
| **solution** | Convert the identical objects to a single reference object. |
| **why** | In many systems, objects can be classified as either values or references. References : when one real-world object corresponds to only one object in the program. References are usually user/order/product/etc. objects. Values : one real-world object corresponds to multipleâ€¦ |
| **how** | Use Replace Constructor with Factory Method on the class from which the references are to be generated. Determine which object will be responsible for providing access to references. Instead of creating a new object, when you need one you now need to get it from a storage object or static dictionary field. Determine whether references will be created in advance or dynamically as necessary. If objects are created in advance, make sure to load them before use. Change the factory method so that it returns aâ€¦ |

## Change Reference To Value (`change-reference-to-value`)

| | |
| --- | --- |
| **problem** | You have a reference object thatâ€™s too small and infrequently changed to justify managing its life cycle. |
| **solution** | Turn it into a value object. |
| **why** | Inspiration to switch from a reference to a value may come from the inconvenience of working with the reference. References require management on your part: They always require requesting the necessary object from storage. References in memory may be inconvenient to work with.â€¦ |
| **how** | Make the object unchangeable. The object shouldnâ€™t have any setters or other methods that change its state and data ( Remove Setting Method may help here). The only place where data should be assigned to the fields of a value object is a constructor. Create a comparison method to be able to compare two values. Check whether you can delete the factory method and make the object constructor public. |

## Replace Array With Object (`replace-array-with-object`)

| | |
| --- | --- |
| **problem** | You have an array that contains various types of data. |
| **solution** | Replace the array with an object that will have separate fields for each element. |
| **why** | Arrays are an excellent tool for storing data and collections of a single type. But if you use an array like post office boxes, storing the username in box 1 and the userâ€™s address in box 14, you will someday be very unhappy that you did. This approach leads to catastrophicâ€¦ |
| **how** | Create the new class that will contain the data from the array. Place the array itself in the class as a public field. Create a field for storing the object of this class in the original class. Donâ€™t forget to also create the object itself in the place where you initiated the data array. In the new class, create access methods one by one for each of the array elements. Give them self-explanatory names that indicate what they do. At the same time, replace each use of an array element in the main code with theâ€¦ |

## Duplicate Observed Data (`duplicate-observed-data`)

| | |
| --- | --- |
| **problem** | Is domain data stored in classes responsible for the GUI? |
| **solution** | Then itâ€™s a good idea to separate the data into separate classes, ensuring connection and synchronization between the domain class and the GUI. |
| **why** | You want to have multiple interface views for the same data (for example, you have both a desktop app and a mobile app). If you fail to separate the GUI from the domain, you will have a very hard time avoiding code duplication and a large number of mistakes. |
| **how** | Hide direct access to domain data in the GUI class . For this, itâ€™s best to use Self Encapsulate Field . So you create the getters and setters for this data. In handlers for GUI class events, use setters to set new field values. This will let you pass these values to the associated domain object . Create a domain class and copy necessary fields from the GUI class to it. Create getters and seters for all these fields. Create an Observer pattern for these two classes: In the domain class , create an array forâ€¦ |

## Change Unidirectional Association To Bidirectional (`change-unidirectional-association-to-bidirectional`)

| | |
| --- | --- |
| **problem** | You have two classes that each need to use the features of the other, but the association between them is only unidirectional. |
| **solution** | Add the missing association to the class that needs it. |
| **why** | Originally the classes had a unidirectional association. But with time, client code needed access to both sides of the association. |
| **how** | Add a field for holding the reverse association. Decide which class will be â€œdominantâ€. This class will contain the methods that create or update the association as elements are added or changed, establishing the association in its class and calling the utility methods for establishing the association in the associated object. Create a utility method for establishing the association in the â€œnon-dominantâ€ class. The method should use what itâ€™s given in parameters to complete the field. Give the method an obviousâ€¦ |

## Change Bidirectional Association To Unidirectional (`change-bidirectional-association-to-unidirectional`)

| | |
| --- | --- |
| **problem** | You have a bidirectional association between classes, but one of the classes doesnâ€™t use the otherâ€™s features. |
| **solution** | Remove the unused association. |
| **why** | A bidirectional association is generally harder to maintain than a unidirectional one, requiring additional code for properly creating and deleting the relevant objects. This makes the program more complicated. In addition, an improperly implemented bidirectional associationâ€¦ |
| **how** | Make sure that one of the following is true for your classes: No association is used. Thereâ€™s another way to get the associated object, such through a database query. The associated object can be passed as an argument to the methods that use it. Depending on your situation, use of a field that contains an association with another object should be replaced by a parameter or method call for getting the object in a different way. Delete the code that assigns the associated object to the field. Delete the now-unusedâ€¦ |

## Replace Magic Number With Symbolic Constant (`replace-magic-number-with-symbolic-constant`)

| | |
| --- | --- |
| **problem** | Your code uses a number that has a certain meaning to it. |
| **solution** | Replace this number with a constant that has a human-readable name explaining the meaning of the number. |
| **why** | A magic number is a numeric value thatâ€™s encountered in the source but has no obvious meaning. This â€œanti-patternâ€ makes it harder to understand the program and refactor the code. Yet more difficulties arise when you need to change this magic number. Find and replace wonâ€™t workâ€¦ |
| **how** | Declare a constant and assign the value of the magic number to it. Find all mentions of the magic number. For each of the numbers that you find, double-check that the magic number in this particular case corresponds to the purpose of the constant. If yes, replace the number with your constant. This is an important step, since the same number can mean absolutely different things (and replaced with different constants, as the case may be). |

## Encapsulate Field (`encapsulate-field`)

| | |
| --- | --- |
| **problem** | You have a public field. |
| **solution** | Make the field private and create access methods for it. |
| **why** | One of the pillars of object-oriented programming is Encapsulation , the ability to conceal object data. Otherwise, all objects would be public and other objects could get and modify the data of your object without any checks and balances! Data is separated from the behaviorsâ€¦ |
| **how** | Create a getter and setter for the field. Find all invocations of the field. Replace receipt of the field value with the getter, and replace setting of new field values with the setter. |

## Encapsulate Collection (`encapsulate-collection`)

| | |
| --- | --- |
| **problem** | A class contains a collection field and a simple getter and setter for working with the collection. |
| **solution** | Make the getter-returned value read-only and create methods for adding/deleting elements of the collection. |
| **why** | A class contains a field that contains a collection of objects. This collection could be an array, list, set or vector. A normal getter and setter have been created for working with the collection. But the collections should be used by a protocol thatâ€™s a bit different from theâ€¦ |
| **how** | Create methods for adding and deleting collection elements. They must accept collection elements in their parameters. Assign an empty collection to the field as the initial value if this isnâ€™t done in the class constructor. Find the calls of the collection field setter. Change the setter so that it uses operations for adding and deleting elements, or make these operations call client code. Note that setters can be used only to replace all collection elements with other ones. Therefore it may be advisable toâ€¦ |

## Replace Type Code With Class (`replace-type-code-with-class`)

| | |
| --- | --- |
| **problem** | A class has a field that contains type code. The values of this type arenâ€™t used in operator conditions and donâ€™t affect the behavior of the program. |
| **solution** | Create a new class and use its objects instead of the type code values. |
| **why** | One of the most common reasons for type code is working with databases, when a database has fields in which some complex concept is coded with a number or string. For example, you have the class User with the field user_role , which contains information about the accessâ€¦ |
| **how** | Create a new class and give it a new name that corresponds to the purpose of the coded type. Here weâ€™ll call it type class . Copy the field containing type code to the type class and make it private. Then create a getter for the field. A value will be set for this field only from the constructor. For each value of the coded type, create a static method in type class . Itâ€™ll be creating a new type class object corresponding to this value of the coded type. In the original class, replace the type of the coded fieldâ€¦ |

## Replace Type Code With Subclasses (`replace-type-code-with-subclasses`)

| | |
| --- | --- |
| **problem** | You have a coded type that directly affects program behavior (values of this field trigger various code in conditionals). |
| **solution** | Create subclasses for each value of the coded type. Then extract the relevant behaviors from the original class to these subclasses. Replace the control flow code with polymorphism. |
| **why** | This refactoring technique is a more complicated twist on Replace Type Code with Class . As in the first refactoring method, you have a set of simple values that constitute all the allowed values for a field. Although these values are often specified as constants and haveâ€¦ |
| **how** | Use Self Encapsulate Field to create a getter for the field that contains type code. Make the superclass constructor private. Create a static factory method with the same parameters as the superclass constructor. It must contain the parameter that will take the starting values of the coded type. Depending on this parameter, the factory method will create objects of various subclasses. To do so, in its code you must create a large conditional but, at least, itâ€™ll be the only one when itâ€™s truly necessary;â€¦ |

## Replace Type Code With State Strategy (`replace-type-code-with-state-strategy`)

| | |
| --- | --- |
| **problem** | You have a coded type that affects behavior but you canâ€™t use subclasses to get rid of it. |
| **solution** | Replace type code with a state object. If itâ€™s necessary to replace a field value with type code, another state object is â€œplugged inâ€. |
| **why** | You have type code and it affects the behavior of a class, therefore we canâ€™t use Replace Type Code with Class . Type code affects the behavior of a class but we canâ€™t create subclasses for the coded type due to the existing class hierarchy or other reasons. Thus means that weâ€¦ |
| **how** | Use Self Encapsulate Field to create a getter for the field that contains type code. Create a new class and give it an understandable name that fits the purpose of the type code. This class will be playing the role of state (or strategy ). In it, create an abstract coded field getter. Create subclasses of the state class for each value of the coded type. In each subclass, redefine the getter of the coded field so that it returns the corresponding value of the coded type. In the abstract state class, create aâ€¦ |

## Replace Subclass With Fields (`replace-subclass-with-fields`)

| | |
| --- | --- |
| **problem** | You have subclasses differing only in their (constant-returning) methods. |
| **solution** | Replace the methods with fields in the parent class and delete the subclasses. |
| **why** | Sometimes refactoring is just the ticket for avoiding type code. In one such case, a hierarchy of subclasses may be different only in the values returned by particular methods. These methods arenâ€™t even the result of computation, but are strictly set out in the methodsâ€¦ |
| **how** | Apply Replace Constructor with Factory Method to the subclasses. Replace subclass constructor calls with superclass factory method calls. In the superclass, declare fields for storing the values of each of the subclass methods that return constant values. Create a protected superclass constructor for initializing the new fields. Create or modify the existing subclass constructors so that they call the new constructor of the parent class and pass the relevant values to it. Implement each constant method in theâ€¦ |

---

# Techniques â€” Simplifying Conditionals


> Simplifying Conditionals â€” flatten logic; polymorphism over switch piles.

**Process:** one small step â†’ tests green â†’ next. âŠ¥ mix feature work in same commit.

## Decompose Conditional (`decompose-conditional`)

| | |
| --- | --- |
| **problem** | You have a complex conditional ( if-then / else or switch ). |
| **solution** | Decompose the complicated parts of the conditional into separate methods: the condition, then and else . |
| **why** | The longer a piece of code is, the harder itâ€™s to understand. Things become even more hard to understand when the code is filled with conditions: While youâ€™re busy figuring out what the code in the then block does, you forget what the relevant condition was. While youâ€™re busyâ€¦ |
| **how** | Extract the conditional to a separate method via Extract Method . Repeat the process for the then and else blocks. |

## Consolidate Conditional Expression (`consolidate-conditional-expression`)

| | |
| --- | --- |
| **problem** | You have multiple conditionals that lead to the same result or action. |
| **solution** | Consolidate all these conditionals in a single expression. |
| **why** | Your code contains many alternating operators that perform identical actions. It isnâ€™t clear why the operators are split up. The main purpose of consolidation is to extract the conditional to a separate method for greater clarity. |
| **how** | â€” |

## Consolidate Duplicate Conditional Fragments (`consolidate-duplicate-conditional-fragments`)

| | |
| --- | --- |
| **problem** | Identical code can be found in all branches of a conditional. |
| **solution** | Move the code outside of the conditional. |
| **why** | Duplicate code is found inside all branches of a conditional, often as the result of evolution of the code within the conditional branches. Team development can be a contributing factor to this. |
| **how** | If the duplicated code is at the beginning of the conditional branches, move the code to a place before the conditional. If the code is executed at the end of the branches, place it after the conditional. If the duplicate code is randomly situated inside the branches, first try to move the code to the beginning or end of the branch, depending on whether it changes the result of the subsequent code. If appropriate and the duplicate code is longer than one line, try using Extract Method . |

## Remove Control Flag (`remove-control-flag`)

| | |
| --- | --- |
| **problem** | You have a boolean variable that acts as a control flag for multiple boolean expressions. |
| **solution** | Instead of the variable, use break , continue and return . |
| **why** | Control flags date back to the days of yore, when â€œproperâ€ programmers always had one entry point for their functions (the function declaration line) and one exit point (at the very end of the function). In modern programming languages this style tic is obsolete, since we haveâ€¦ |
| **how** | Find the value assignment to the control flag that causes the exit from the loop or current iteration. Replace it with break , if this is an exit from a loop; continue , if this is an exit from an iteration, or return , if you need to return this value from the function. Remove the remaining code and checks associated with the control flag. |

## Replace Nested Conditional With Guard Clauses (`replace-nested-conditional-with-guard-clauses`)

| | |
| --- | --- |
| **problem** | You have a group of nested conditionals and itâ€™s hard to determine the normal flow of code execution. |
| **solution** | Isolate all special checks and edge cases into separate clauses and place them before the main checks. Ideally, you should have a â€œflatâ€ list of conditionals, one after the other. |
| **why** | Spotting the â€œconditional from hellâ€ is fairly easy. The indentations of each level of nestedness form an arrow, pointing to the right in the direction of pain and woe: if () { if () { do { if () { if () { if () { ... } } ... } ... } while (); ... } else { ... } } Itâ€™sâ€¦ |
| **how** | Try to rid the code of side effectsâ€” Separate Query from Modifier may be helpful for the purpose. This solution will be necessary for the reshuffling described below. Isolate all guard clauses that lead to calling an exception or immediate return of a value from the method. Place these conditions at the beginning of the method. |

## Replace Conditional With Polymorphism (`replace-conditional-with-polymorphism`)

| | |
| --- | --- |
| **problem** | You have a conditional that performs various actions depending on object type or properties. |
| **solution** | Create subclasses matching the branches of the conditional. In them, create a shared method and move code from the corresponding branch of the conditional to it. Then replace the conditional with the relevant method call. The result is that the properâ€¦ |
| **why** | This refactoring technique can help if your code contains operators performing various tasks that vary based on: Class of the object or interface that it implements Value of an objectâ€™s field Result of calling one of an objectâ€™s methods If a new object property or type appears,â€¦ |
| **how** | Preparing to Refactor For this refactoring technique, you should have a ready hierarchy of classes that will contain alternative behaviors. If you donâ€™t have a hierarchy like this, create one. Other techniques will help to make this happen: Replace Type Code with Subclasses . Subclasses will be created for all values of a particular object property. This approach is simple but less flexible since you canâ€™t create subclasses for the other properties of the object. Replace Type Code with State/Strategy . A classâ€¦ |

## Introduce Null Object (`introduce-null-object`)

| | |
| --- | --- |
| **problem** | Since some methods return null instead of real objects, you have many checks for null in your code. |
| **solution** | Instead of null , return a null object that exhibits the default behavior. |
| **why** | Dozens of checks for null make your code longer and uglier. Drawbacks - The price of getting rid of conditionals is creating yet another new class. |
| **how** | From the class in question, create a subclass that will perform the role of null object. In both classes, create the method isNull() , which will return true for a null object and false for a real class. Find all places where the code may return null instead of a real object. Change the code so that it returns a null object. Find all places where the variables of the real class are compared with null . Replace these checks with a call for isNull() . - If methods of the original class are run in these conditionalsâ€¦ |

## Introduce Assertion (`introduce-assertion`)

| | |
| --- | --- |
| **problem** | For a portion of code to work correctly, certain conditions or values must be true. |
| **solution** | Replace these assumptions with specific assertion checks. |
| **why** | Say that a portion of code assumes something about, for example, the current condition of an object or value of a parameter or local variable. Usually this assumption will always hold true except in the event of an error. Make these assumptions obvious by adding correspondingâ€¦ |
| **how** | When you see that a condition is assumed, add an assertion for this condition in order to make sure. Adding the assertion shouldnâ€™t change the programâ€™s behavior. Donâ€™t overdo it with use of assertions for everything in your code. Check for only the conditions that are necessary for correct functioning of the code. If your code is working normally even when a particular assertion is false, you can safely remove the assertion. |

---

# Techniques â€” Simplifying Method Calls


> Simplifying Method Calls â€” clearer interfaces between classes.

**Process:** one small step â†’ tests green â†’ next. âŠ¥ mix feature work in same commit.

## Rename Method (`rename-method`)

| | |
| --- | --- |
| **problem** | The name of a method doesnâ€™t explain what the method does. |
| **solution** | Rename the method. |
| **why** | Perhaps a method was poorly named from the very beginningâ€”for example, someone created the method in a rush and didnâ€™t give proper care to naming it well. Or perhaps the method was well named at first but as its functionality grew, the method name stopped being a good descriptor. |
| **how** | See whether the method is defined in a superclass or subclass. If so, you must repeat all steps in these classes too. The next method is important for maintaining the functionality of the program during the refactoring process. Create a new method with a new name. Copy the code of the old method to it. Delete all the code in the old method and, instead of it, insert a call for the new method. Find all references to the old method and replace them with references to the new one. Delete the old method. If the oldâ€¦ |

## Add Parameter (`add-parameter`)

| | |
| --- | --- |
| **problem** | A method doesnâ€™t have enough data to perform certain actions. |
| **solution** | Create a new parameter to pass the necessary data. |
| **why** | You need to make changes to a method and these changes require adding information or data that was previously not available to the method. |
| **how** | See whether the method is defined in a superclass or subclass. If the method is present in them, you will need to repeat all the steps in these classes as well. The following step is critical for keeping your program functional during the refactoring process. Create a new method by copying the old one and add the necessary parameter to it. Replace the code for the old method with a call to the new method. You can plug in any value to the new parameter (such as null for objects or a zero for numbers). Find allâ€¦ |

## Remove Parameter (`remove-parameter`)

| | |
| --- | --- |
| **problem** | A parameter isnâ€™t used in the body of a method. |
| **solution** | Remove the unused parameter. |
| **why** | Every parameter in a method call forces the programmer reading it to figure out what information is found in this parameter. And if a parameter is entirely unused in the method body, this â€œnoggin scratchingâ€ is for naught. And in any case, additional parameters are extra codeâ€¦ |
| **how** | See whether the method is defined in a superclass or subclass. If so, is the parameter used there? If the parameter is used in one of these implementations, hold off on this refactoring technique. The next step is important for keeping the program functional during the refactoring process. Create a new method by copying the old one and delete the relevant parameter from it. Replace the code of the old method with a call to the new one. Find all references to the old method and replace them with references to theâ€¦ |

## Separate Query From Modifier (`separate-query-from-modifier`)

| | |
| --- | --- |
| **problem** | Do you have a method that returns a value but also changes something inside an object? |
| **solution** | Split the method into two separate methods. As you would expect, one of them should return the value and the other one modifies the object. |
| **why** | This factoring technique implements Command and Query Responsibility Segregation . This principle tells us to separate code responsible for getting data from code that changes something inside an object. Code for getting data is named a query . Code for changing things in theâ€¦ |
| **how** | Create a new query method to return what the original method did. Change the original method so that it returns only the result of calling the new query method . Replace all references to the original method with a call to the query method . Immediately before this line, place a call to the modifier method . This will save you from side effects in case if the original method was used in a condition of a conditional operator or loop. Get rid of the value-returning code in the original method, which now has becomeâ€¦ |

## Parameterize Method (`parameterize-method`)

| | |
| --- | --- |
| **problem** | Multiple methods perform similar actions that are different only in their internal values, numbers or operations. |
| **solution** | Combine these methods by using a parameter that will pass the necessary special value. |
| **why** | If you have similar methods, you probably have duplicate code, with all the consequences that this entails. Whatâ€™s more, if you need to add yet another version of this functionality, you will have to create yet another method. Instead, you could simply run the existing methodâ€¦ |
| **how** | Create a new method with a parameter and move it to the code thatâ€™s the same for all classes, by applying Extract Method . Note that sometimes only a certain part of methods is actually the same. In this case, refactoring consists of extracting only the same part to a new method. In the code of the new method, replace the special/differing value with a parameter. For each old method, find the places where itâ€™s called, replacing these calls with calls to the new method that include a parameter. Then delete the oldâ€¦ |

## Replace Parameter With Explicit Methods (`replace-parameter-with-explicit-methods`)

| | |
| --- | --- |
| **problem** | A method is split into parts, each of which is run depending on the value of a parameter. |
| **solution** | Extract the individual parts of the method into their own methods and call them instead of the original method. |
| **why** | A method containing parameter-dependent variants has grown massive. Non-trivial code is run in each branch and new variants are added very rarely. |
| **how** | For each variant of the method, create a separate method. Run these methods based on the value of a parameter in the main method. Find all places where the original method is called. In these places, place a call for one of the new parameter-dependent variants. When no calls to the original method remain, delete it. |

## Preserve Whole Object (`preserve-whole-object`)

| | |
| --- | --- |
| **problem** | You get several values from an object and then pass them as parameters to a method. |
| **solution** | Instead, try passing the whole object. |
| **why** | The problem is that each time before your method is called, the methods of the future parameter object must be called. If these methods or the quantity of data obtained for the method are changed, you will need to carefully find a dozen such places in the program and implementâ€¦ |
| **how** | Create a parameter in the method for the object from which you can get the necessary values. Now start removing the old parameters from the method one by one, replacing them with calls to the relevant methods of the parameter object. Test the program after each replacement of a parameter. Delete the getter code from the parameter object that had preceded the method call. |

## Replace Parameter With Method Call (`replace-parameter-with-method-call`)

| | |
| --- | --- |
| **problem** | Calling a query method and passing its results as the parameters of another method, while that method could call the query directly. |
| **solution** | Instead of passing the value through a parameter, try placing a query call inside the method body. |
| **why** | A long list of parameters is hard to understand. In addition, calls to such methods often resemble a series of cascades, with winding and exhilarating value calculations that are hard to navigate yet have to be passed to the method. So if a parameter value can be calculatedâ€¦ |
| **how** | Make sure that the value-getting code doesnâ€™t use parameters from the current method, since theyâ€™ll be unavailable from inside another method. If so, moving the code isnâ€™t possible. If the relevant code is more complicated than a single method or function call, use Extract Method to isolate this code in a new method and make the call simple. In the code of the main method, replace all references to the parameter being replaced with calls to the method that gets the value. Use Remove Parameter to eliminate theâ€¦ |

## Introduce Parameter Object (`introduce-parameter-object`)

| | |
| --- | --- |
| **problem** | Your methods contain a repeating group of parameters. |
| **solution** | Replace these parameters with an object. |
| **why** | Identical groups of parameters are often encountered in multiple methods. This causes code duplication of both the parameters themselves and of related operations. By consolidating parameters in a single class, you can also move the methods for handling this data there as well,â€¦ |
| **how** | Create a new class that will represent your group of parameters. Make the class immutable. In the method that you want to refactor, use Add Parameter , which is where your parameter object will be passed. In all method calls, pass the object created from old method parameters to this parameter. Now start deleting old parameters from the method one by one, replacing them in the code with fields of the parameter object. Test the program after each parameter replacement. When done, see whether thereâ€™s any point inâ€¦ |

## Remove Setting Method (`remove-setting-method`)

| | |
| --- | --- |
| **problem** | The value of a field should be set only when itâ€™s created, and not change at any time after that. |
| **solution** | So remove methods that set the fieldâ€™s value. |
| **why** | You want to prevent any changes to the value of a field. |
| **how** | The value of a field should be changeable only in the constructor. If the constructor doesnâ€™t contain a parameter for setting the value, add one. Find all setter calls. If a setter call is located right after a call for the constructor of the current class, move its argument to the constructor call and remove the setter. Replace setter calls in the constructor with direct access to the field. Delete the setter. |

## Hide Method (`hide-method`)

| | |
| --- | --- |
| **problem** | A method isnâ€™t used by other classes or is used only inside its own class hierarchy. |
| **solution** | Make the method private or protected. |
| **why** | Quite often, the need to hide methods for getting and setting values is due to development of a richer interface that provides additional behavior, especially if you started with a class that added little beyond mere data encapsulation. As new behavior is built into the class,â€¦ |
| **how** | Regularly try to find methods that can be made private. Static code analysis and good unit test coverage can offer a big leg up. Make each method as private as possible. |

## Replace Constructor With Factory Method (`replace-constructor-with-factory-method`)

| | |
| --- | --- |
| **problem** | You have a complex constructor that does something more than just setting parameter values in object fields. |
| **solution** | Create a factory method and use it to replace constructor calls. |
| **why** | The most obvious reason for using this refactoring technique is related to Replace Type Code with Subclasses . You have code in which a object was previously created and the value of the coded type was passed to it. |
| **how** | Create a factory method. Place a call to the current constructor in it. Replace all constructor calls with calls to the factory method. Declare the constructor private. Investigate the constructor code and try to isolate the code not directly related to constructing an object of the current class, moving such code to the factory method. |

## Replace Error Code With Exception (`replace-error-code-with-exception`)

| | |
| --- | --- |
| **problem** | A method returns a special value that indicates an error? |
| **solution** | Throw an exception instead. |
| **why** | Returning error codes is an obsolete holdover from procedural programming. In modern programming, error handling is performed by special classes, which are named exceptions. If a problem occurs, you â€œthrowâ€ an error, which is then â€œcaughtâ€ by one of the exception handlers.â€¦ |
| **how** | Try to perform these refactoring steps for only one error code at a time. This will make it easier to keep all the important information in your head and avoid errors. Find all calls to a method that returns error codes and, instead of checking for an error code, wrap it in try / catch blocks. Inside the method, instead of returning an error code, throw an exception. Change the method signature so that it contains information about the exception being thrown ( @throws section). |

## Replace Exception With Test (`replace-exception-with-test`)

| | |
| --- | --- |
| **problem** | You throw an exception in a place where a simple test would do the job? |
| **solution** | Replace the exception with a condition test. |
| **why** | Exceptions should be used to handle irregular behavior related to an unexpected error. They shouldnâ€™t serve as a replacement for testing. If an exception can be avoided by simply verifying a condition before running, then do so. Exceptions should be reserved for real errors.â€¦ |
| **how** | Create a conditional for an edge case and move it before the try/catch block. Move code from the catch section inside this conditional. In the catch section, place the code for throwing a usual unnamed exception and run all the tests. If no exceptions were thrown during the tests, get rid of the try / catch operator. |

---

# Techniques â€” Generalization


> Dealing with Generalization â€” hierarchy moves; inheritance â†” delegation.

**Process:** one small step â†’ tests green â†’ next. âŠ¥ mix feature work in same commit.

## Pull Up Field (`pull-up-field`)

| | |
| --- | --- |
| **problem** | Two classes have the same field. |
| **solution** | Remove the field from subclasses and move it to the superclass. |
| **why** | Subclasses grew and developed separately, causing identical (or nearly identical) fields and methods to appear. |
| **how** | Make sure that the fields are used for the same needs in subclasses. If the fields have different names, give them the same name and replace all references to the fields in existing code. Create a field with the same name in the superclass. Note that if the fields were private, the superclass field should be protected. Remove the fields from the subclasses. You may want to consider using Self Encapsulate Field for the new field, in order to hide it behind access methods. |

## Pull Up Method (`pull-up-method`)

| | |
| --- | --- |
| **problem** | Your subclasses have methods that perform similar work. |
| **solution** | Make the methods identical and then move them to the relevant superclass. |
| **why** | Subclasses grew and developed independently of one another, causing identical (or nearly identical) fields and methods. |
| **how** | Investigate similar methods in superclasses. If they arenâ€™t identical, format them to match each other. If methods use a different set of parameters, put the parameters in the form that you want to see in the superclass. Copy the method to the superclass. Here you may find that the method code uses fields and methods that exist only in subclasses and therefore arenâ€™t available in the superclass. To solve this, you can: For fields: use either Pull Up Field or Self- Encapsulate Field to create getters and settersâ€¦ |

## Pull Up Constructor Body (`pull-up-constructor-body`)

| | |
| --- | --- |
| **problem** | Your subclasses have constructors with code thatâ€™s mostly identical. |
| **solution** | Create a superclass constructor and move the code thatâ€™s the same in the subclasses to it. Call the superclass constructor in the subclass constructors. |
| **why** | How is this refactoring technique different from Pull Up Method ? In Java, subclasses canâ€™t inherit a constructor, so you canâ€™t simply apply Pull Up Method to the subclass constructor and delete it after removing all the constructor code to the superclass. In addition toâ€¦ |
| **how** | Create a constructor in a superclass. Extract the common code from the beginning of the constructor of each subclass to the superclass constructor. |

## Push Down Method (`push-down-method`)

| | |
| --- | --- |
| **problem** | Is behavior implemented in a superclass used by only one (or a few) subclasses? |
| **solution** | Move this behavior to the subclasses. |
| **why** | At first a certain method was meant to be universal for all classes but in reality is used in only one subclass. This situation can occur when planned features fail to materialize. Such situations can also occur after partial extraction (or removal) of functionality from aâ€¦ |
| **how** | Declare the method in a subclass and copy its code from the superclass. Remove the method from the superclass. Find all places where the method is used and verify that itâ€™s called from the necessary subclass. |

## Push Down Field (`push-down-field`)

| | |
| --- | --- |
| **problem** | Is a field used only in a few subclasses? |
| **solution** | Move the field to these subclasses. |
| **why** | Although it was planned to use a field universally for all classes, in reality the field is used only in some subclasses. This situation can occur when planned features fail to pan out, for example. This can also occur due to extraction (or removal) of part of the functionalityâ€¦ |
| **how** | Declare a field in all the necessary subclasses. Remove the field from the superclass. |

## Extract Subclass (`extract-subclass`)

| | |
| --- | --- |
| **problem** | A class has features that are used only in certain cases. |
| **solution** | Create a subclass and use it in these cases. |
| **why** | Your main class has methods and fields for implementing a certain rare use case for the class. While the case is rare, the class is responsible for it and it would be wrong to move all the associated fields and methods to an entirely separate class. But they could be moved to aâ€¦ |
| **how** | Create a new subclass from the class of interest. If you need additional data to create objects from a subclass, create a constructor and add the necessary parameters to it. Donâ€™t forget to call the constructorâ€™s parent implementation. Find all calls to the constructor of the parent class. When the functionality of a subclass is necessary, replace the parent constructor with the subclass constructor. Move the necessary methods and fields from the parent class to the subclass. Do this via Push Down Method and Pushâ€¦ |

## Extract Superclass (`extract-superclass`)

| | |
| --- | --- |
| **problem** | You have two classes with common fields and methods. |
| **solution** | Create a shared superclass for them and move all the identical fields and methods to it. |
| **why** | One type of code duplication occurs when two classes perform similar tasks in the same way, or perform similar tasks in different ways. Objects offer a built-in mechanism for simplifying such situations via inheritance. But oftentimes this similarity remains unnoticed untilâ€¦ |
| **how** | Create an abstract superclass. Use Pull Up Field , Pull Up Method , and Pull Up Constructor Body to move the common functionality to a superclass. Start with the fields, since in addition to the common fields you will need to move the fields that are used in the common methods. Look for places in the client code where use of subclasses can be replaced with your new class (such as in type declarations). |

## Extract Interface (`extract-interface`)

| | |
| --- | --- |
| **problem** | Multiple clients are using the same part of a class interface. Another case: part of the interface in two classes is the same. |
| **solution** | Move this identical portion to its own interface. |
| **why** | Interfaces are very apropos when classes play special roles in different situations. Use Extract Interface to explicitly indicate which role. Another convenient case arises when you need to describe the operations that a class performs on its server. If itâ€™s planned toâ€¦ |
| **how** | Create an empty interface. Declare common operations in the interface. Declare the necessary classes as implementing the interface. Change type declarations in the client code to use the new interface. |

## Collapse Hierarchy (`collapse-hierarchy`)

| | |
| --- | --- |
| **problem** | You have a class hierarchy in which a subclass is practically the same as its superclass. |
| **solution** | Merge the subclass and superclass. |
| **why** | Your program has grown over time and a subclass and superclass have become practically the same. A feature was removed from a subclass, a method was moved to the superclass... and now you have two look-alike classes. |
| **how** | Select which class is easier to remove: the superclass or its subclass. Use Pull Up Field and Pull Up Method if you decide to get rid of the subclass. If you choose to eliminate the superclass, go for Push Down Field and Push Down Method . Replace all uses of the class that youâ€™re deleting with the class to which the fields and methods are to be migrated. Often this will be code for creating classes, variable and parameter typing, and documentation in code comments. Delete the empty class. |

## Form Template Method (`form-template-method`)

| | |
| --- | --- |
| **problem** | Your subclasses implement algorithms that contain similar steps in the same order. |
| **solution** | Move the algorithm structure and identical steps to a superclass, and leave implementation of the different steps in the subclasses. |
| **why** | Subclasses are developed in parallel, sometimes by different people, which leads to code duplication, errors, and difficulties in code maintenance, since each change must be made in all subclasses. |
| **how** | Split algorithms in the subclasses into their constituent parts described in separate methods. Extract Method can help with this. The resulting methods that are identical for all subclasses can be moved to a superclass via Pull Up Method . The non-similar methods can be given consistent names via Rename Method . Move the signatures of non-similar methods to a superclass as abstract ones by using Pull Up Method . Leave their implementations in the subclasses. And finally, pull up the main method of the algorithmâ€¦ |

## Replace Inheritance With Delegation (`replace-inheritance-with-delegation`)

| | |
| --- | --- |
| **problem** | You have a subclass that uses only a portion of the methods of its superclass (or itâ€™s not possible to inherit superclass data). |
| **solution** | Create a field and put a superclass object in it, delegate methods to the superclass object, and get rid of inheritance. |
| **why** | Replacing inheritance with composition can substantially improve class design if: Your subclass violates the Liskov substitution principle , i.e., if inheritance was implemented only to combine common code but not because the subclass is an extension of the superclass. Theâ€¦ |
| **how** | Create a field in the subclass for holding the superclass. During the initial stage, place the current object in it. Change the subclass methods so that they use the superclass object instead of this . For methods inherited from the superclass that are called in the client code, create simple delegating methods in the subclass. Remove the inheritance declaration from the subclass. Change the initialization code of the field in which the former superclass is stored by creating a new object. |

## Replace Delegation With Inheritance (`replace-delegation-with-inheritance`)

| | |
| --- | --- |
| **problem** | A class contains many simple methods that delegate to all methods of another class. |
| **solution** | Make the class a delegate inheritor, which makes the delegating methods unnecessary. |
| **why** | Delegation is a more flexible approach than inheritance, since it allows changing how delegation is implemented and placing other classes there as well. Nonetheless, delegation stops being beneficial if you delegate actions to only one class and all of its public methods. Inâ€¦ |
| **how** | Make the class a subclass of the delegate class. Place the current object in a field containing a reference to the delegate object. Delete the methods with simple delegation one by one. If their names were different, use Rename Method to give all the methods a single name. Replace all references to the delegate field with references to the current object. Remove the delegate field. |


